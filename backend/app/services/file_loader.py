import io
import gzip
import uuid
import shutil
from pathlib import Path
from typing import Dict, Tuple
import pandas as pd
from fastapi import UploadFile
from app.core.config import settings
from app.core.errors import InvalidDatasetError, DatasetNotFoundError

# In-memory dataframe cache for fast interaction during warm container lifetime
_DATASETS_CACHE: Dict[str, Tuple[pd.DataFrame, str]] = {}

class FileLoaderService:
    @staticmethod
    def load_from_upload(upload_file: UploadFile) -> Tuple[str, str, pd.DataFrame]:
        filename = upload_file.filename or "uploaded_data.csv"
        raw_suffix = Path(filename).suffix.lower()
        
        # Check if file is gzipped (e.g. data.csv.gz or client-compressed)
        is_gz = raw_suffix == ".gz"
        actual_name = filename[:-3] if is_gz else filename
        suffix = Path(actual_name).suffix.lower()

        if suffix not in [".csv", ".xlsx", ".xls"]:
            raise InvalidDatasetError(f"Unsupported file extension '{suffix}'. Supported: .csv, .xlsx, .xls")

        contents = upload_file.file.read()
        if len(contents) == 0:
            raise InvalidDatasetError("The uploaded file is empty.")
        if len(contents) > settings.MAX_UPLOAD_SIZE_BYTES:
            raise InvalidDatasetError(f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB.")

        # Transparent gzip decompression if compressed
        if is_gz or (len(contents) > 2 and contents[:2] == b"\x1f\x8b"):
            try:
                contents = gzip.decompress(contents)
            except Exception as e:
                raise InvalidDatasetError(f"Failed to decompress gzipped upload: {str(e)}")

        df = FileLoaderService._parse_bytes(contents, suffix, actual_name)
        
        dataset_id = str(uuid.uuid4())
        _DATASETS_CACHE[dataset_id] = (df, actual_name)
        
        # Save compressed pickle copy to serverless storage directory (/tmp)
        try:
            settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
            save_path = settings.STORAGE_DIR / f"{dataset_id}.pkl.gz"
            df.to_pickle(save_path, compression="gzip")
            # Store filename meta
            meta_path = settings.STORAGE_DIR / f"{dataset_id}.meta"
            meta_path.write_text(actual_name, encoding="utf-8")
        except Exception as e:
            # Non-blocking if storage write fails
            pass
            
        return dataset_id, actual_name, df

    @staticmethod
    def load_sample_dataset(sample_key: str) -> Tuple[str, str, pd.DataFrame]:
        sample_map = {
            "sensor": ("sensor_readings.csv", settings.SAMPLE_DIR / "sensor_readings.csv"),
            "housing": ("housing_market.csv", settings.SAMPLE_DIR / "housing_market.csv")
        }
        if sample_key not in sample_map:
            raise InvalidDatasetError(f"Unknown sample dataset '{sample_key}'. Available: {list(sample_map.keys())}")
        
        filename, path = sample_map[sample_key]
        if not path.exists():
            # Check secondary fallback path
            alt_path = Path(__file__).resolve().parent.parent / "samples" / filename
            if alt_path.exists():
                path = alt_path
            else:
                raise InvalidDatasetError(f"Sample dataset file '{filename}' was not found.")
            
        df = pd.read_csv(path)
        dataset_id = f"sample_{sample_key}"
        _DATASETS_CACHE[dataset_id] = (df, filename)
        return dataset_id, filename, df

    @staticmethod
    def get_dataset(dataset_id: str) -> Tuple[pd.DataFrame, str]:
        # 1. Warm in-memory cache
        if dataset_id in _DATASETS_CACHE:
            return _DATASETS_CACHE[dataset_id]
        
        # 2. Check sample datasets (always deterministic across any serverless worker)
        if dataset_id.startswith("sample_"):
            sample_key = dataset_id.replace("sample_", "")
            df, filename = FileLoaderService.load_sample_dataset(sample_key)[:2]
            return df, filename
        
        # 3. Check /tmp compressed pickle cache
        pkl_path = settings.STORAGE_DIR / f"{dataset_id}.pkl.gz"
        meta_path = settings.STORAGE_DIR / f"{dataset_id}.meta"
        if pkl_path.exists():
            try:
                df = pd.read_pickle(pkl_path, compression="gzip")
                filename = meta_path.read_text(encoding="utf-8") if meta_path.exists() else "dataset.csv"
                _DATASETS_CACHE[dataset_id] = (df, filename)
                return df, filename
            except Exception:
                pass

        # 4. Check legacy raw storage disk matches
        matches = list(settings.STORAGE_DIR.glob(f"{dataset_id}_*"))
        if matches:
            file_path = matches[0]
            filename = file_path.name.replace(f"{dataset_id}_", "")
            suffix = file_path.suffix.lower()
            with open(file_path, "rb") as f:
                df = FileLoaderService._parse_bytes(f.read(), suffix, filename)
            _DATASETS_CACHE[dataset_id] = (df, filename)
            return df, filename

        raise DatasetNotFoundError(dataset_id)

    @staticmethod
    def _parse_bytes(contents: bytes, suffix: str, filename: str) -> pd.DataFrame:
        try:
            if suffix == ".csv":
                try:
                    df = pd.read_csv(io.BytesIO(contents), encoding="utf-8")
                except UnicodeDecodeError:
                    df = pd.read_csv(io.BytesIO(contents), encoding="latin-1")
            elif suffix in [".xlsx", ".xls"]:
                df = pd.read_excel(io.BytesIO(contents))
            else:
                raise InvalidDatasetError("Unsupported file type.")
                
            if df.empty:
                raise InvalidDatasetError("Dataset contains no rows or columns.")
            if df.shape[1] < 1:
                raise InvalidDatasetError("Dataset must have at least 1 column.")
            if len(df) > settings.MAX_ROWS_LIMIT:
                df = df.iloc[:settings.MAX_ROWS_LIMIT]
                
            # Clean duplicate column names
            cols = pd.Series(df.columns.astype(str))
            for dup in cols[cols.duplicated()].unique():
                cols[cols == dup] = [f"{dup}_{i}" if i != 0 else dup for i in range((cols == dup).sum())]
            df.columns = cols.values
            
            return df
        except Exception as e:
            if isinstance(e, InvalidDatasetError):
                raise e
            raise InvalidDatasetError(f"Failed to parse file '{filename}': {str(e)}")

