# Matching Module

Smart matching system connecting Workers with Jobs.

## Features
*   **Skill-based Matching**: Calculates a match score (0-100%) based on overlapping skills between Job and Worker.
*   **Review-based Ranking**: Boosts workers with higher ratings and more reviews.
*   **Recommendations**:
    - **For Workers**: Suggests jobs matching their skill set.
    - **For Clients**: Suggests top-rated workers with relevant skills for their job.

## Algorithms
1.  **Skill Match**: `(Matching Skills / Required Skills) * 100`.
2.  **Rating Bonus**: Workers with high ratings get a boost in ranking.
3.  **Filtering**: Excludes jobs the worker has already applied to.

## Endpoints
*   `GET /api/matching/jobs/recommended`
    - Query Params: `limit`, `minBudget`, `jobType`.
    - Returns: List of jobs sorted by match score.
*   `GET /api/matching/workers/:jobId`
    - Returns: List of workers suitable for the specific job.
