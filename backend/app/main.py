from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings
from app.api.routes import datasets, relationships, models, explanations, insights, charts

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("datalens")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Interactive data exploration, relationship graph, and what-if simulation platform.",
    redirect_slashes=False
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred while processing the analytical request."}
    )

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "runtime": "vercel-serverless" if settings.IS_VERCEL else "standard",
        "storage": str(settings.STORAGE_DIR)
    }


# Register API routers under both /api and root to guarantee 0 routing mismatch on Vercel
api_routers = [
    datasets.router,
    relationships.router,
    models.router,
    explanations.router,
    insights.router,
    charts.router,
]
for router in api_routers:
    app.include_router(router, prefix=settings.API_PREFIX)
    app.include_router(router, prefix="")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
