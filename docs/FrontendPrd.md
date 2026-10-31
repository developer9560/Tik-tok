
Loading older messages…

Pasted text(20261030-154153).txt
Document
now see this response now but i  need this requirements "I need a bot that can search for TikTok videos using the following filters:

* Video Upload Date: Search videos based on their upload date.

* Number of Views: For example, videos with views ranging from 100 to 600K.

* Video Category: Football, programming, Tetris, sports, etc.

* Language Detection: Verify that all videos are in Russian.

Bot Functionality:

The bot should search for videos according to my selected filters and send me the exact number of video links I request.

Example Search Settings:

* Videos must be at least 2 days old.

* View count must be between 500 and 500K.

* Video category: Football.

* Language: Russian.

* Total number of videos required: 500 links.

Expected Output:

The bot should send me 500 TikTok video links that match all the specified criteria." how i can full fill this requirements , i have to build dashboard for it
…
Now we're getting somewhere. I've inspected the actual Bright Data response you shared, and we can design ClipScope around real returned data rather than assumptions.

Good news: your keyword-discovery dataset already returns most of the metadata your client needs. We do not need to build a separate scraper for every filter.

There is one significant gap: the response does not provide a reliable spoken-language field or transcript. We'll need a separate language-detection step.

1. What your actual API response gives us
Your football search results contain these fields:

Client requirement

Returned field

Available?

Video link

url

Yes

Upload date

create_time

Yes

Number of views

play_count

Yes

Category information

description, hashtags

Yes

Creator information

profile_username, profile_url

Yes

Spoken language

No reliable language field

Missing

Transcript/subtitles

subtitle_info, subtitle_url

Sometimes empty

For example, your response contains:

{
  "url": "https://www.tiktok.com/@football_skills_81/video/7664728137988656417",
  "description": "unbelievable moment in football #football",
  "create_time": "2026-07-20T21:39:49.000Z",
  "play_count": 268000,
  "hashtags": [
    "football",
    "respect",
    "moment"
  ],
  "profile_username": "football skills 3",
  "region": "DZ",
  "subtitle_url": null,
  "subtitle_info": []
}

This is enough to apply the date and view-count filters. The region field is also available, but it is not proof of the language spoken in a video. 
Pasted text(20261030-154153).txt

2. How we will fulfill all four filters
Let's take your client's example:

Upload date: at least 2 days old

Views: 500–500,000

Category: Football

Language: Russian

Required results: 500

We should implement each filter separately.

Filter A — Video upload date
Your response contains create_time.

For example:

from datetime import datetime, timedelta, timezone

cutoff_date = datetime.now(timezone.utc) - timedelta(days=2)

def matches_upload_date(video):
    created_at = datetime.fromisoformat(
        video["create_time"].replace("Z", "+00:00")
    )

    return created_at <= cutoff_date

This excludes videos uploaded less than two days ago.

Filter B — Number of views
Your response contains play_count.

def matches_views(video, min_views, max_views):
    views = video.get("play_count")

    if views is None:
        return False

    return min_views <= int(views) <= max_views

For the example:

matches_views(video, 500, 500000)

Notice that your actual response contains videos with 694,400 views and 1,100,000 views. Those must be excluded.

Filter C — Video category
Use description and hashtags for initial category matching.

def matches_category(video, category):
    description = (video.get("description") or "").lower()

    hashtags = [
        tag.lower()
        for tag in video.get("hashtags", [])
    ]

    category = category.lower()

    return (
        category in description
        or category in hashtags
    )

For football, this catches relevant hashtags and descriptions.

However, keyword matching is only a first-stage classifier. For more accurate category detection, we can later add an AI classifier that analyzes descriptions and transcripts.

Filter D — Russian language detection
This is the most important additional component.

Your Bright Data response does not guarantee a transcript. For example:

{
  "subtitle_url": null,
  "subtitle_info": []
}

We cannot simply inspect the description and declare that the video is Russian. A video may have an English caption but Russian speech, or the reverse.

I recommend this pipeline:

Language detection pipeline

TikTok video URL

Check available subtitles

Use them if present and usable

If subtitles are unavailable, transcribe audio

Use an automatic speech recognition model

Detect language

Identify Russian (language code: ru)

Accept or reject video

Accept only when Russian is detected with sufficient confidence

A practical starting point is:

Speech-to-text: Whisper.

Language identification: Whisper's detected language or a language identification library.

Store the detected language, confidence and transcript.

For videos with no meaningful speech, music-only content or uncertain detection, use an unverified status rather than pretending they are Russian.

3. The most important architectural decision: don't stop after collecting 500 videos
Your client wants 500 videos that satisfy every filter.

Suppose Bright Data discovers 500 football videos:

300 satisfy the date condition.

220 satisfy the view range.

130 are actually Russian.

100 satisfy all filters together.

You have only 100 qualified results, not 500.

Therefore, the system must collect more candidates until it has 500 qualified, unique videos or reaches its configured collection limit.

I recommend this workflow:

User submits search settings

Create search job in database

Bright Data discovers candidate videos

Apply date, views and category filters

Transcribe and detect language

Are 500 unique qualified videos collected?

Yes

Complete job

No

Discover more candidates

We should set a maximum collection budget and stop when it is reached. If fewer than 500 videos qualify, report the actual count. Never manufacture results or silently relax the client's filters.

4. Dashboard design
Yes, you should build a dashboard. I recommend React for the frontend and FastAPI for the backend.

Here is the dashboard layout I would build.

ClipScope

TikTok Video Discovery

Dashboard
Create a new search

Search keyword / category
Football
Minimum views
500
Maximum views
500,000
Minimum video age
2 days
Language
Russian
Number of videos required
500
Start video search

Search results overview

500
Target videos

0
Qualified videos

0
Pending verification

0%
Completion

Illustrative dashboard preview — not connected to your backend.

Dashboard pages
Page

Functionality

Overview

Total searches, completed jobs, qualified videos

New Search

Configure filters and start a job

Search History

View previous searches

Live Progress

Discovered, filtered, verified and rejected counts

Video Results

Display matching video links and metadata

Export

Download CSV or Excel

Settings

API configuration, collection limits and language confidence

For each video, show:

Video link

Description

Creator

Upload date

Views

Category

Detected language

Language confidence

Verification status

5. Backend architecture I recommend
Since you are already using FastAPI, MySQL and React, keep that stack.

React Dashboard

FastAPI

Authentication · Search API · Results API

Celery / Worker

Background jobs

MySQL

Jobs and video records

Redis

Queue and job state

Whisper / ASR

Speech and language detection

Bright Data API

TikTok video discovery and metadata

For a real 500-video job, don't run the entire process inside one FastAPI request. Use background workers so searches continue even if the user closes the dashboard.

Suggested database tables
search_jobs

Column

Purpose

id

Job ID

keyword

Football

min_views

500

max_views

500000

min_age_days

2

language

ru

target_count

500

status

pending/running/completed/partial/failed

videos

Column

Purpose

id

Database ID

video_url

TikTok URL

post_id

Unique TikTok post ID

description

Caption

created_at

Upload date

view_count

Views

category

Football

detected_language

ru/en/etc.

language_confidence

Detection confidence

search_job_id

Related search

Use a unique constraint on post_id to prevent duplicate videos across discovery batches.

6. API endpoints for the dashboard
I would start with these:

Method

Endpoint

Purpose

POST

/api/search-jobs

Create a search

GET

/api/search-jobs/{id}

Get search details

GET

/api/search-jobs/{id}/progress

Get live progress

GET

/api/search-jobs/{id}/videos

Fetch matching videos

GET

/api/search-jobs/{id}/export

Export CSV

POST

/api/search-jobs/{id}/cancel

Cancel a search

Example request from React:

{
  "keyword": "football",
  "min_views": 500,
  "max_views": 500000,
  "min_age_days": 2,
  "language": "ru",
  "target_count": 500
}

The backend handles discovery, filtering, transcription and result storage. The dashboard only manages the job and displays its progress.

7. Development roadmap
Don't build the entire dashboard in one go. Build it in these stages.

Stage 1 — Search and metadata filtering

Integrate your working Bright Data keyword dataset. Implement date, views and category filters. Save results to MySQL.

Start here
Stage 2 — Language detection

Add subtitle extraction, audio transcription and Russian-language verification.

Stage 3 — Background processing

Add Redis and Celery. Implement snapshot monitoring, retries, deduplication and collection limits.

Stage 4 — React dashboard

Build search forms, job history, live progress, results table and exports.

Stage 5 — Production testing

Test 10, then 50, then 100 videos. Measure match rate and cost before attempting 500.

8. Two risks you must discuss with the client
Exact quantity: You can promise to return 500 matching videos only when at least 500 eligible videos are discoverable and verifiable within the collection budget. Otherwise, return the actual number and explain the shortfall.

Commercial scraping permission: Before production, confirm that your Bright Data plan and dataset license authorize this intended commercial use, and that your collection method complies with TikTok's applicable terms. Don't assume that access to a scraper automatically grants permission for every use.

Also, your current sample shows region values such as PK, NG, DZ and FR. So searching for football does not automatically mean US creators. If the client later wants creator geography, that needs its own clearly defined filter.

My recommendation: let's start building Stage 1
I don't want you to waste time polishing a dashboard before the core search engine works.

The first milestone should be:

Input: Football, 500–500,000 views, at least 2 days old.

Output: A MySQL table containing only unique videos that satisfy those three filters.

Then we'll add Russian language verification, followed by the dashboard.

One question before we finalize the architecture: Does your client require Russian to be the language spoken in the video, or is Russian text in the caption/description sufficient?

That decision changes the language-detection cost and implementation significantly.

English correction

Your sentence: "now see this response now but i need this requirements"

Better: "Now that we have this response, how can I fulfill these requirements?"

Advanced: "Now that we have verified the API response, how should I architect the complete solution to meet the client's requirements and build the dashboard?"

one more thing to fetch the all information and detail form the api  , is need backend run by fastapi, i think all deta can be fetched react js simple frontend and it can be saved any file and can be show in proper dashboard load all videos  and its detail like products
You're thinking in the right direction. You do not necessarily need FastAPI just to fetch data from Bright Data and display it in a dashboard. A React-only application can work for a small prototype. However, for your client's actual product, I recommend keeping a backend.

Let's understand why.

1. Can React fetch Bright Data API directly?
Technically, yes. React can send HTTP requests to Bright Data, receive JSON, filter the videos, and display them in a dashboard.

The flow would be:

React.js Dashboard

Search, filters, video cards, tables and analytics
Bright Data API

Fetch video data and metadata
JSON Response

Video URLs, descriptions, views, dates, hashtags, creator information, etc.
But there are three serious problems with this approach:

API token exposure: If you put your Bright Data API token in React, users can inspect the browser's network requests and extract it.

Long-running jobs: Bright Data may return a snapshot ID while processing continues. The browser shouldn't be responsible for managing a large collection process.

Data persistence: Saving everything in browser storage or downloading JSON files is not a reliable long-term database strategy.

Never put a private Bright Data API token in frontend code.

2. My recommended architecture
Use React for the dashboard and FastAPI for API communication, filtering, and data storage.

Recommended architecture
React.js Dashboard

Search form · Video cards · Filters · Pagination · Export
HTTP / JSON
FastAPI Backend

Authentication · Bright Data integration · Filtering · Processing · APIs
MySQL

Store video metadata and search history
Bright Data

Discover and retrieve video data
For the first version, you don't need Redis or Celery immediately. FastAPI background processing or a separate worker can be introduced as collection volume grows.

3. Where should you save all video information?
You have three options:

Storage

Purpose

Recommendation

JSON file

Save raw API responses

Useful for testing and backup

CSV file

Export video details

Useful for clients

MySQL

Store, filter, search and retrieve videos

Best for the actual dashboard

For example, one video record could look like this:

{
  "post_id": "123456789",
  "url": "https://www.tiktok.com/@user/video/123456789",
  "description": "Football highlights",
  "create_time": "2026-10-25T10:00:00Z",
  "play_count": 268000,
  "digg_count": 12000,
  "comment_count": 450,
  "share_count": 1200,
  "hashtags": ["football", "sports"],
  "profile_username": "example_user",
  "detected_language": "ru",
  "language_confidence": 0.96,
  "category": "football"
}

This is an illustrative normalized record, not a guarantee that every field is returned by Bright Data. Preserve the original API response separately as well, so you don't lose fields.

4. How the complete workflow should work
Client enters search criteria in React: category, minimum views, maximum views, minimum video age, language and target count.

React sends those criteria to FastAPI.

FastAPI calls the Bright Data API using its private token.

Bright Data returns a snapshot ID or completed results.

FastAPI retrieves the completed snapshot.

Backend filters videos based on the client's criteria.

Backend saves matching records in MySQL.

React retrieves the filtered results and displays them.

Client can export the results as CSV or JSON.

5. What should the dashboard look like?
Here is the structure I'd build:

TikTok Video Finder

Dashboard concept
Total collected
2,450
Matching videos
500
Russian detected
385
Pending verification
65
Search filters

Category
Football
Language
Russian
Minimum views
500
Maximum views
500,000
Video results

TikTok - Make Your Day
Football highlights

@example_user · 25 Oct 2026
268K views · Russian · 96% confidence

Verified match

Parier sur les buteurs : stratégies efficaces et pièges à éviter | Coworking France
Amazing last-minute goal

@football_daily · 24 Oct 2026
120K views · Russian · 93% confidence

Verified match

Illustrative dashboard layout and sample values, not live API data.
The video cards can show a thumbnail, creator, description, upload date, views, language, category and a link to open the original TikTok video. A detailed view can display all available metadata, similar to an e-commerce product detail page.

6. My recommendation: build in this order
Stage

What to build

1

FastAPI endpoint to fetch Bright Data results

2

Save raw response in JSON

3

Parse and filter video metadata

4

Save filtered videos in MySQL

5

Build React dashboard

6

Add language detection

7

Add pagination, CSV export and search history

8

Add background jobs and production deployment

One important distinction: collecting video metadata and verifying spoken Russian are separate jobs. Your dashboard should not mark a video as Russian just because its description or hashtags are Russian.

One decision before we start coding
Do you want the first version to use:

1. Architecture


React only — quick prototype, no secure backend persistence

React + FastAPI — recommended for the client project
2. Data storage


JSON files — simplest initial testing

MySQL — persistent searchable database

Both — MySQL plus raw JSON backups
My choice: React + FastAPI + MySQL, with raw JSON backups. It gives you a proper client-ready system without adding unnecessary infrastructure too early.

Let's build the TikTok video discovery project using fastapi architecture and mysql storage. Guide me step by step, starting with the backend and Bright Data integration.
Perfect. We'll build this as a proper backend-first project: FastAPI + MySQL + Bright Data, then connect the React dashboard once the backend is working.

We'll do it in small, testable stages. Don't start building the dashboard yet. First, make sure the backend can securely trigger a Bright Data collection, track its progress, retrieve the results, and save the video records.

Project: TikTok Video Discovery System
1. Backend architecture
React frontend

Search criteria and video results — we'll build this later
FastAPI backend

API endpoints · validation · filtering · collection orchestration
Bright Data

Video discovery and metadata
MySQL

Search jobs and video records
2. Development roadmap
Stage

What we'll implement

Status

1

FastAPI project setup and configuration

Starting now

2

Bright Data API integration

Pending

3

Snapshot progress and result retrieval

Pending

4

Parse, validate and filter video data

Pending

5

MySQL models and persistence

Pending

6

Search-job APIs and background processing

Pending

7

React dashboard integration

Pending

Stage 1 — Set up the FastAPI project
We'll first create a backend that can communicate with Bright Data independently of MySQL. Once we prove that the API integration works, we'll add the database.

One important detail from checking Bright Data's current documentation: asynchronous collection uses POST /datasets/v3/trigger, progress is checked with GET /datasets/v3/progress/{snapshot_id}, and results are downloaded from the snapshot endpoint. 

Bright Data Docs
+1

Also, don't blindly reuse a dataset ID from an old example. Bright Data lists several separate TikTok scrapers, including Posts by Search, Posts by URL, and Profiles. We'll keep the ID configurable and use the exact input schema generated by your own dataset's API page. 

5K records/Month for Free

Step 1.1 — Create the project
Open your terminal:

mkdir tiktok-video-discovery
cd tiktok-video-discovery

python -m venv venv

Activate the virtual environment.

Windows PowerShell:

.\venv\Scripts\Activate.ps1

Install dependencies:

pip install fastapi uvicorn httpx pydantic-settings python-dotenv

Create this folder structure:

tiktok-video-discovery/
│
├── app/
│   ├── __init__.py
│   ├── main.py
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   └── brightdata.py
│   │
│   └── services/
│       ├── __init__.py
│       └── brightdata_service.py
│
├── .env
├── .env.example
├── .gitignore
└── requirements.txt
The purpose of each folder:

Folder

Responsibility

core

Environment variables and application configuration

routers

FastAPI endpoints

services

External API communication and business logic

main.py

Application entry point

Step 1.2 — Configure environment variables
Create .env:

APP_NAME=TikTok Video Discovery API
APP_ENV=development

BRIGHTDATA_API_TOKEN=YOUR_BRIGHTDATA_API_TOKEN
BRIGHTDATA_DATASET_ID=YOUR_POSTS_SEARCH_DATASET_ID

BRIGHTDATA_BASE_URL=https://api.brightdata.com
Replace the two placeholders with your actual credentials.

Create .env.example with the same variable names but placeholder values.

Create .gitignore:

venv/
__pycache__/
*.pyc
.env
.idea/
.vscode/
Important: Never commit .env to GitHub. Your Bright Data token must remain on the backend.

Step 1.3 — Create the configuration
File: app/core/config.py

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    APP_NAME: str = "TikTok Video Discovery API"
    APP_ENV: str = "development"

    BRIGHTDATA_API_TOKEN: str
    BRIGHTDATA_DATASET_ID: str

    BRIGHTDATA_BASE_URL: str = "https://api.brightdata.com"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

What is happening here?

BaseSettings reads configuration from environment variables.

env_file=".env" loads your local environment file.

settings creates one reusable configuration object.

Your API token won't need to be hardcoded in service files.

Step 1.4 — Create the Bright Data service
File: app/services/brightdata_service.py

This service will communicate with Bright Data. We'll implement three operations:

Trigger a collection.

Check collection progress.

Download the completed snapshot.

import httpx

from app.core.config import settings


class BrightDataService:

    def __init__(self):

        self.base_url = settings.BRIGHTDATA_BASE_URL

        self.headers = {
            "Authorization": f"Bearer {settings.BRIGHTDATA_API_TOKEN}",
            "Content-Type": "application/json"
        }

        self.dataset_id = settings.BRIGHTDATA_DATASET_ID

    async def trigger_collection(self, payload: dict):

        url = f"{self.base_url}/datasets/v3/trigger"

        params = {
            "dataset_id": self.dataset_id,
            "format": "json"
        }

        async with httpx.AsyncClient(timeout=60.0) as client:

            response = await client.post(
                url,
                params=params,
                headers=self.headers,
                json=payload
            )


Notice the distinction:

POST triggers collection.

GET checks progress.

GET retrieves the results.

We're using httpx.AsyncClient so our FastAPI endpoints can make asynchronous HTTP requests.

Step 1.5 — Create the Bright Data router
File: app/routers/brightdata.py

For now, we'll accept a complete payload so we can test the dataset's exact input format without making assumptions about its schema.

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any

from app.services.brightdata_service import brightdata_service

router = APIRouter(
    prefix="/api/brightdata",
    tags=["Bright Data"]
)


class TriggerRequest(BaseModel):
    payload: dict[str, Any]


@router.post("/trigger")
async def trigger_collection(request: TriggerRequest):

    try:

        result = await brightdata_service.trigger_collection(
            request.payload
        )

        return {
            "success": True,
            "message": "Collection triggered successfully",
            "data": result
        }

    except Exception as error:

        raise HTTPException(
            status_code=502,
            detail=f"Bright Data request failed: {str(error)}"

Step 1.6 — Create the main application
File: app/main.py

from fastapi import FastAPI

from app.core.config import settings
from app.routers.brightdata import router as brightdata_router


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0"
)


@app.get("/")
async def root():

    return {
        "message": "TikTok Video Discovery API is running"
    }


@app.get("/health")
async def health():

    return {
        "status": "healthy"
    }


app.include_router(brightdata_router)

Create requirements.txt:

fastapi
uvicorn[standard]
httpx
pydantic-settings
python-dotenv
Step 1.7 — Run your backend
From the project root:

uvicorn app.main:app --reload

Open:

API: http://127.0.0.1:8000

Swagger documentation: http://127.0.0.1:8000/docs

Health check: http://127.0.0.1:8000/health

Expected result
{
  "status": "healthy"
}

Stage 2 — Connect your actual TikTok dataset
Before triggering a real collection, we need to match your dataset's API configuration.

From your earlier setup, the expected input looked like this:

{
  "input": [
    {
      "search_url": "YOUR_TIKTOK_SEARCH_URL",
      "country": "US"
    }
  ],
  "limit_per_input": null
}

Your generated cURL also used these query parameters:

type=discover_new
discover_by=search_url
If those parameters are still present in your dataset's generated cURL, update trigger_collection() in brightdata_service.py:

params = {
    "dataset_id": self.dataset_id,
    "format": "json",
    "type": "discover_new",
    "discover_by": "search_url"
}

Don't add these parameters to other datasets unless their generated API request requires them. Bright Data's different TikTok scrapers have different input formats.

Step 2.1 — Test the collection
Open Swagger at http://127.0.0.1:8000/docs.

Find POST /api/brightdata/trigger, click Try it out, and submit:

{
  "payload": {
    "input": [
      {
        "search_url": "YOUR_TIKTOK_SEARCH_URL",
        "country": "US"
      }
    ],
    "limit_per_input": null
  }
}

Use a valid search URL and the exact input fields from your Bright Data dashboard.

A successful asynchronous request should return something similar to:

{
  "success": true,
  "message": "Collection triggered successfully",
  "data": {
    "snapshot_id": "sd_xxxxxxxxxxxxx",
    "message": "Your request is still in progress"
  }
}

Your actual response may differ.

Step 2.2 — Check collection progress
Copy the returned snapshot_id.

Call:

GET /api/brightdata/progress/sd_xxxxxxxxxxxxx
Possible statuses include:

starting

running

ready

failed

canceled

These are Bright Data's documented snapshot states. 

Bright Data Docs

Step 2.3 — Download the snapshot
When the status becomes ready, call:

GET /api/brightdata/snapshot/sd_xxxxxxxxxxxxx
You should receive the collected records in JSON format.

We will then parse these records and store them in MySQL.

Your assignment before Stage 3
I want you to run this yourself rather than blindly copy everything.

Create the project structure.

Add the Python files.

Configure your .env.

Run FastAPI.

Test /health.

Trigger one small Bright Data collection.

Check its progress and retrieve the snapshot.

One thing I need from you: Share the exact cURL generated by your Bright Data dashboard for the TikTok Posts Search dataset. Remove the API token before sharing it.

That will let me verify the dataset ID, request parameters, and JSON payload before we build the integration further.

Next, we'll implement a proper collection workflow with snapshot tracking, error handling, duplicate prevention, and MySQL persistence. Don't move to the React dashboard until that workflow works reliably.

English refinement: Your sentence was already clear. A slightly more natural version is: "Let's build the TikTok video discovery project using FastAPI and MySQL. Guide me through it step by step, starting with the backend and Bright Data integration."

hey chatgpt write Product Requirements documenet , prd.md file i will build with codex, so please write in detail


I've created the detailed PRD for your TikTok Video Discovery Platform.

prd.md

48 KB · Markdown · Version 1.0
Ready to use with Codex

Created
Download PRD.md

What's included
Product vision, goals and scope.

Detailed functional requirements with priorities and IDs.

Bright Data API integration.

Search jobs and asynchronous snapshot processing.

MySQL database schema and relationships.

Video filtering, deduplication and language verification.

FastAPI endpoints and React dashboard requirements.

Security, testing, deployment and error handling.

Development milestones and acceptance criteria.

Open questions requiring client confirmation.

Specific instructions for Codex.

How to start with Codex
Create/open your project repository in Codex.

Put prd.md in the project root.

Give Codex this instruction:

Read the complete prd.md file and understand the product requirements.

We will implement this project incrementally, following the milestones in the PRD.

Start with Milestone 1 only: FastAPI backend foundation and Bright Data integration.

Before writing code:

Inspect the repository.

Identify missing information.

Ask for the actual Bright Data dataset schema or generated cURL if needed.

Propose the implementation structure.

Do not implement MySQL or React yet. Write clean, modular, production-conscious code with tests. Do not invent Bright Data API parameters or dataset fields.

My recommendation: Don't ask Codex to build the entire application in one prompt. Build milestone by milestone, test each stage, and review the code before moving forward. That's how you'll avoid a large but unreliable codebase.


prd.md
Document
write frontend Prd.md file for frontend desing it must responsive modern stylish and show all detail and proper video link, and all information dashboad ,history  login page

I've created the detailed Frontend PRD for your TikTok Video Discovery Platform.

frontend-prd.md

Markdown · 39.5 KB · Version 1.0

Ready for Codex
 Download frontend-prd.md

What's covered
Area

Requirements

Login

Login, validation, protected routes, logout

Dashboard

Analytics, metrics, charts, recent activity

New Search

Keyword, category, views, date, language filters

Active Jobs

Collection status, progress, errors

Video Results

Cards, tables, sorting, filtering, pagination

Video Details

All metadata, creator details, engagement metrics

TikTok Links

Exact original video URL, open and copy actions

History

Previous searches, reopen, export

Settings

Profile, theme and preferences

Responsive design

Mobile, tablet, laptop and desktop

Security

Authentication, protected routes, no exposed API secrets

How to use it with Codex
Keep both documents in your project root:

tiktok-video-discovery/
│
├── prd.md
├── frontend-prd.md
│
├── backend/
└── frontend/
Give Codex this instruction:

Read both prd.md and frontend-prd.md completely.

Use prd.md as the overall product and backend requirements, and frontend-prd.md as the frontend design and implementation specification.

First inspect the existing repository and backend API contracts.

Implement Frontend Milestone 1 only:

React + TypeScript setup

Modern responsive design system

Sidebar and top navigation

Mobile navigation

Routing

Reusable UI components

Loading, empty and error states

The design must look like a polished premium SaaS product, not a generic admin template.

Do not generate fake dashboard data or nonfunctional buttons. Do not change the existing backend.

After implementation, run the project, lint, and type checks. Report all changed files and remaining work.

My advice: Build the visual foundation first, then authentication, dashboard, search workflow, and finally video details. The video detail page and original TikTok link are especially important because that's where the client will inspect the actual discovered content.


frontend-prd.md
Document
Frontend Product Requirements Document (Frontend PRD)
TikTok Video Discovery Platform
Document: frontend-prd.md
Version: 1.0
Status: Ready for frontend implementation
Date: 30 October 2026
Product: TikTok Video Discovery Platform
Frontend stack: React, TypeScript, Vite, Tailwind CSS
Backend: FastAPI REST API
Primary users: Client/research users and administrators

1. Purpose of This Document
This document defines the complete frontend experience for the TikTok
Video Discovery Platform. It is intended to be used by Codex as the
implementation specification for the React application.

The frontend must be modern, responsive, polished, accessible, and easy
to operate. It must present search configuration, collection progress,
TikTok video results, detailed video metadata, search history, exports,
user authentication, and account/settings screens.

The frontend consumes data from the FastAPI backend. It must not call
Bright Data directly and must never contain the Bright Data API token or
other provider secrets.

This document focuses on frontend design, user experience, pages,
components, interactions, responsive behavior, API integration, and
acceptance criteria. The backend PRD remains the source of truth for
business rules, data processing, and provider integration.

2. Product Experience and Design Direction
2.1 Product identity
The application should feel like a premium SaaS research and discovery
platform rather than a basic admin template.

Design characteristics: - Modern, clean, confident, and data-focused. -
Strong visual hierarchy. - Spacious layouts with consistent alignment. -
High-quality typography. - Subtle borders, shadows, and hover states. -
Clear status colors and meaningful data visualization. - Video-first
result cards with useful metadata. - Fast navigation and low-friction
search creation. - Consistent desktop, tablet, and mobile experiences.

Avoid: - Overly bright gradients everywhere. - Excessive
glassmorphism. - Too many colors competing for attention. - Huge
decorative headings that waste dashboard space. - Fake charts or
hardcoded metrics. - Cluttered tables with every field visible at
once. - Buttons that look interactive but do nothing.

2.2 Suggested visual direction
Use a neutral, premium SaaS palette: - App background: very light cool
grey or neutral surface. - Main surfaces: white in light mode. - Primary
text: deep charcoal/navy. - Secondary text: muted grey. - Primary
action: indigo, blue, or violet; choose one consistent accent. -
Success: restrained green. - Warning/partial: amber. - Error: red. -
Neutral/in-progress: blue or grey.

Provide both light and dark themes if practical. Light theme may be the
initial default. Theme preference should persist locally, but must not
be used to store authentication secrets.

Use a consistent spacing scale, radius scale, typography scale, icon
style, and component variants. Prefer Lucide icons or an equivalent
consistent icon library.

2.3 Typography
Use a modern readable sans-serif font such as Inter, Geist, or a system
font stack. Use clear typographic levels: - Page title. - Section
title. - Card title. - Body text. - Secondary metadata. - Small labels
and helper text.

Do not use tiny text for important video metadata. Ensure readable
contrast and comfortable line height.

3. Frontend Goals
The frontend must allow a user to:

Log in securely.
View an overview of discovery activity.
Create a search with filters.
Monitor a collection job.
View matching video results.
Open a detailed video view containing all available metadata.
Open the original TikTok video using a clear, working external link.
Review past and active searches.
Reopen the results of a previous search.
Export search results.
Manage profile and permitted application settings.
Understand when results are partial, language is unverified, or a
job has failed.
4. User Roles and Navigation
4.1 User roles
Client/research user
View dashboard.
Create and manage searches.
View results and video details.
View search history.
Export permitted results.
Manage own profile and preferences.
Administrator
All user permissions, plus: - View provider/system status if backend
exposes it. - Manage users if supported by backend. - View
administrative diagnostics. - Manage permitted configuration settings.

Do not expose provider API credentials in the frontend, even to
administrators. Provider secrets must be managed server-side.

4.2 Main application navigation
Desktop sidebar:

Overview
New Search
Active Jobs
Search History
Saved Videos (optional/P1)
Settings
Bottom/sidebar account area: - User avatar or initials. - User name and
email. - Profile. - Theme toggle. - Logout.

Mobile navigation: - Use a compact top bar with menu drawer, or a bottom
navigation for the most important destinations. - Do not squeeze the
full desktop sidebar into a narrow screen. - Keep primary actions
accessible with one or two taps.

5. Information Architecture and Routes
Use React Router or an equivalent routing library.

Suggested routes:

Route Page Access

/login Login Public

/forgot-password Forgot password Public, if backend
supports it

/reset-password Reset password Public, if backend
supports it

/ Overview dashboard Authenticated

/search/new Create new search Authenticated

/jobs Active/recent jobs Authenticated

/jobs/:jobId Job detail and progress Authenticated

/jobs/:jobId/videos Results for a job Authenticated

/videos/:videoId Video detail Authenticated

/history Search history Authenticated

/saved Saved videos Authenticated, optional

/settings User settings Authenticated

/admin Admin/system page Admin only, if
supported
Route behavior: - Unauthenticated users visiting protected routes are
redirected to /login. - Authenticated users visiting /login are
redirected to /. - Unknown routes show a designed 404 page with a
route back to the dashboard. - Preserve useful return navigation when
redirecting to login, without putting secrets in URLs.

6. Global Application Layout
6.1 Desktop layout
Fixed or sticky left sidebar.
Main content area with a consistent max-width or fluid layout.
Top header with breadcrumb/page context, notifications if
implemented, and user menu.
Main content uses a consistent horizontal gutter.
Sidebar can collapse to icon-only mode.
Content must remain usable on common laptop and desktop widths.
6.2 Tablet layout
Sidebar may collapse into a drawer.
Tables should become horizontally scrollable or transform into
compact cards.
Search form should use two columns where space allows and one column
when narrow.
Do not hide critical status or action controls.
6.3 Mobile layout
Single-column content.
Compact top bar.
Search controls stack vertically.
Result cards use a mobile-friendly layout.
Tables should transform into cards or use carefully designed
horizontal scrolling.
Video detail metadata should use labeled rows or grouped sections.
Buttons and touch targets should be comfortably tappable.
Avoid horizontal page overflow.
7. Page Requirements
7.1 Login Page
Purpose
Allow an authorized user to access the platform.

Design
Create a polished split-screen or centered-card login layout: - Product
logo/name and short value proposition. - Login form. - Optional subtle
product visual or abstract data/video illustration. - Responsive
single-column layout on mobile. - Do not use a fake TikTok login flow.
This is the platform's own application login.

Fields
Email address.
Password.
Show/hide password control.
Remember me only if supported by the backend/session design.
Actions
Sign in.
Forgot password (only if password recovery is implemented by
backend).
Optional invitation/account registration only if the backend
supports it.
Validation and states
Required field validation.
Email format validation.
Inline field errors.
Loading state while submitting.
Invalid credentials message.
Network/server error state.
Prevent repeated submissions while request is in progress.
Never reveal whether an email exists unless the authentication
policy explicitly permits it.
Security requirements
Use the backend's documented authentication mechanism.
Prefer secure, HttpOnly, SameSite cookies if supported by the
backend.
Do not store access tokens or passwords in localStorage.
Never log passwords or authentication tokens.
Do not build fake authentication with hardcoded credentials.
7.2 Overview Dashboard
Purpose
Give the user an immediate understanding of the platform's activity and
recent outcomes.

Header
Page title: Overview.
Short description such as "Monitor your TikTok discovery activity."
Primary CTA: "New Search".
Optional date range filter if supported by backend metrics.
Summary cards
Display real backend data: - Total searches. - Active jobs. - Unique
videos collected. - Matching videos. - Videos awaiting language
verification. - Failed jobs.

Each card should have: - Clear label. - Large metric. - Optional
comparison/trend only if the backend supplies valid historical data. -
Small icon. - Link to the relevant filtered page when useful.

Never hardcode dashboard metrics or invent percentage changes.

Charts and analytics
Potential charts: - Search jobs over time. - Videos discovered
vs. matched over time. - Match/rejection distribution. - Language
verification distribution. - View-count distribution for a selected job.

Only render charts when real backend data is available. Provide a useful
empty state when no data exists. Do not manufacture chart points.

Recent activity
Show recent jobs with: - Search keyword/category. - Created date/time. -
Status. - Matching count. - Target count. - Action to open job.

Empty state
For a new account: - Explain what the platform does. - Provide a
prominent "Create your first search" CTA. - Do not show misleading
zero-filled charts.

7.3 New Search Page
Purpose
Allow users to define a discovery search accurately and understand the
meaning of each filter.

Layout
Use a clean form with grouped sections and a right-side summary panel on
desktop. Stack sections on mobile.

Section A: Search topic
Fields: - Keyword/topic (required). - Category (required or derived
according to backend contract). - Optional additional keywords/hashtags
if supported.

Examples shown as helper text may include football, programming, or
Tetris. Examples must not be submitted automatically.

Section B: Video filters
Fields: - Minimum views. - Maximum views. - Minimum age in days OR date
range, according to API contract. - Optional region filter only if
supported and its meaning is clearly documented.

Validation: - Minimum views cannot exceed maximum views. - Numeric
values cannot be negative. - Age cannot be negative. - Clear helper text
explaining inclusive view boundaries. - Explain that "at least 2 days
old" is evaluated against the saved search cutoff time.

Section C: Language
Fields: - Target language selector. - Language evidence requirement: -
Description/caption text. - Subtitle text. - Spoken audio. - Only show
options the backend actually supports. - If spoken audio verification is
not implemented or permitted, disable it and explain why.

Important UI copy: "Caption language and spoken language are different.
A Russian caption does not prove that the video contains Russian
speech."

Section D: Result target and collection limits
Fields: - Target matching videos. - Optional maximum collection
batches/records/time if exposed by backend. - Display a note that the
target is not guaranteed.

Suggested helper text: "The platform returns the videos that satisfy all
selected filters. If fewer qualifying videos are discovered within the
collection limits, the job will show a partial result instead of
relaxing your filters."

Search summary
Show a live summary of selected criteria: - Topic/category. - View
range. - Minimum age/date range. - Target language and evidence type. -
Requested result count.

Submission
Button: "Start Search".

On submit: 1. Validate locally. 2. Submit to FastAPI. 3. Disable submit
while pending. 4. Display backend validation errors. 5. On success,
navigate to /jobs/:jobId. 6. Do not show success until the backend
confirms job creation.

7.4 Active Jobs Page
Purpose
Show jobs that are queued, collecting, retrieving, processing, or
otherwise not terminal.

Layout
Page title and short description.
Status tabs or filter chips.
Search/filter by keyword.
Sort by newest/oldest.
Responsive job cards/table.
Job row/card fields
Search keyword.
Category.
Created time.
Status.
Target count.
Discovered count.
Processed count.
Matched count.
Last updated time.
Open details action.
Status styling
Use consistent badges: - Queued: neutral. - Collecting: blue. -
Retrieving: blue. - Processing: indigo. - Completed: green. - Partially
completed: amber. - Failed: red. - Canceled: neutral grey.

Do not rely on color alone; include readable status text and accessible
labels.

Polling
Poll job progress at a controlled interval while the page is
visible.
Stop or slow polling when the job reaches a terminal state.
Avoid overlapping requests.
Pause or reduce polling when the browser tab is hidden.
Use backend-provided timestamps/status; do not invent progress
percentages.
7.5 Job Detail and Progress Page
Purpose
Explain what happened during a specific search and show its current or
final outcome.

Header
Search title/keyword.
Category.
Job ID (copyable).
Status.
Created time.
Actions: View Results, Export (when available), Retry (only if
eligible), Cancel (only if supported).
Criteria summary
Display the exact saved criteria: - Keyword. - Category. - Min/max
views. - Minimum age/cutoff timestamp or date range. - Target
language. - Language evidence type. - Target count. - Collection limits,
if used.

Progress overview
Display actual known counts: - Discovered. - Processed. - Matched. -
Rejected. - Duplicates. - Unverified.

If the provider does not provide a reliable progress percentage, show
lifecycle stages: 1. Queued. 2. Collecting. 3. Retrieving. 4.
Processing. 5. Completed/partial/failed.

Do not create a fake percentage from elapsed time.

Partial result state
If the target was not reached: - Clearly show requested target. - Show
actual matched count. - Show shortfall. - Show the backend-provided
reason. - Explain that filters were not relaxed.

Failed state
Show a clear summary.
Provide retry action only if backend permits.
Do not show raw stack traces or secrets.
Provide a support/debug identifier if available.
Results preview
Show a small preview of matching videos and a "View all results" action.

7.6 Video Results Page
Purpose
Provide a searchable, sortable, paginated catalog of videos matching a
selected search.

Header
Search name/keyword.
Status and result count.
Search criteria shortcut.
Export button.
Back to job details.
Result summary
Show: - Total matching records. - Current page and page size. - Language
verification distribution if returned by API.

Filters
Client-side filters may be used only for the currently loaded records.
Filters that must apply to the full result set must be sent to the
backend.

Possible filters: - Language status. - Category. - Minimum/maximum views
within the job result set. - Creator username. - Date range. -
Verification status.

Sorting
Views high to low.
Views low to high.
Newest.
Oldest.
Creator username.
Layout modes
Support a card/grid view and a table/list view if practical. Remember
the user's last selected layout.

Video card design
Each card should show: - Thumbnail/preview image when available. - Video
description (clamped to a few lines). - Creator username. - Upload
date. - View count. - Like/comment/share counts when available. -
Category label. - Detected language. - Language evidence type. -
Verification badge. - "View details" action. - "Open TikTok" external
link.

The entire card may open the internal detail route, but external TikTok
links must have a separate clear action. Avoid nested clickable elements
that cause confusing behavior.

Table columns
On wide screens: - Thumbnail. - Description. - Creator. - Upload date. -
Views. - Likes. - Category. - Language/evidence. - Verification. -
Actions.

On small screens, transform rows into cards or allow a clearly indicated
horizontally scrollable table. Never cause the entire page to overflow
horizontally.

Pagination
Server-side pagination.
Show current page and total count when available.
Page size selector (e.g. 20, 50, 100) within backend limits.
Preserve search/job context when changing pages.
Loading skeleton while fetching.
Empty state when no matching records exist.
7.7 Video Detail Page
Purpose
Show all available information for one video, similar to an e-commerce
product detail page.

This page is a major product feature. It must make the original TikTok
URL obvious and easy to open.

Layout
Desktop: - Main content area with large video thumbnail/preview image. -
Details and metadata in a structured right/secondary panel or below the
preview. - Clear primary action to open the original TikTok post.

Mobile: - Single-column layout. - Thumbnail at top. - Primary external
link near the top. - Metadata grouped into expandable sections if
necessary.

Main video section
Show: - Thumbnail/preview if available. - Description. - Creator
username and profile link if available. - Upload date/time. -
Duration. - Category. - Original TikTok URL.

Prominent TikTok link
Provide a button or link such as "Open original TikTok video".
Requirements: - Use the exact canonical TikTok post URL
returned/normalized by the backend. - Open in a new tab/window. - Use
target="_blank" with rel="noopener noreferrer" where applicable. -
Validate that the URL uses an allowed TikTok host before rendering as a
trusted external link. - If URL is missing or invalid, disable the
action and show "Original link unavailable". - Do not construct a TikTok
URL from incomplete fields unless backend explicitly provides a
canonical URL. - Do not route the link through an arbitrary redirect
service.

Engagement metrics
Show available values: - Views. - Likes. - Comments. - Shares. -
Saves/collects.

Format large numbers in a readable way (e.g. 268K) but provide the exact
number in a tooltip or accessible text.

Missing values should display "Not available", not zero.

Creator information
Show available fields: - Username. - Profile URL. - Profile avatar. -
Provider profile ID.

Content metadata
Show: - Hashtags. - Video duration. - Sound/original audio metadata. -
Provider-supplied region, with a note that it does not necessarily prove
creator location. - Post type. - Collection source/discovery input when
permitted.

Category classification
Show: - Assigned category. - Matching terms or evidence. -
Classification method (keyword/rule/model/manual). - Confidence if
supplied. - A clear label when category is heuristic or unverified.

Language analysis
Show: - Target language. - Detected language. - Evidence type
(description, subtitle, transcript, audio, unknown). - Confidence where
available. - Status (verified match, likely match, mismatch, unverified,
unavailable).

Use explicit copy: - "Russian detected in description" is not the same
as "Russian speech verified". - If evidence is insufficient, display
"Language not verified".

Raw data
Optional expandable "Raw provider data" section for administrators only.
Render formatted JSON safely; do not execute or interpret provider text
as HTML.

Actions
Open original TikTok.
Copy TikTok URL.
Back to search results.
Save/bookmark video if backend supports it.
Export individual record if supported.
7.8 Search History Page
Purpose
Allow users to find and reopen previous searches.

Header
Title: Search History.
Search input.
Status filters.
Date filter if supported.
Optional "New Search" action.
Table/list fields
Search keyword.
Category.
Date created.
View range.
Minimum age.
Target language/evidence type.
Requested count.
Actual matched count.
Job status.
Actions.
Actions
Open search/job details.
View results.
Duplicate criteria into a new search (if backend supports it).
Export results.
Delete/archive only if supported and authorized.
Search history behavior
Use server-side pagination.
Preserve filters in URL query parameters where appropriate.
Provide loading, empty, and error states.
Clearly distinguish partial results from completed results.
Empty state
Explain that completed and previous searches will appear here. Provide a
"Create Search" CTA.

7.9 Settings Page
Initial settings may include: - User profile information. - Change
password, if supported. - Theme preference. - Table/card default
preference. - Notification preferences only if backend supports them.

Do not include Bright Data token fields in the normal user settings UI.
Provider configuration belongs to a protected backend/admin workflow and
secrets must never be returned to the browser.

7.10 Forgot/Reset Password
Implement only if the backend provides the required endpoints and
email/token workflow. Do not build a frontend-only password reset
simulation.

8. Shared Components
Build reusable components instead of duplicating page-specific UI.

Required components: - AppShell - Sidebar - MobileNavigation -
Topbar - PageHeader - Breadcrumbs - MetricCard - StatusBadge -
SearchCriteriaSummary - SearchForm - JobCard - JobProgress -
VideoCard - VideoTable - VideoThumbnail - VideoMetrics -
LanguageStatus - CategoryBadge - VerificationBadge -
Pagination - FilterBar - EmptyState - ErrorState -
LoadingSkeleton - ConfirmDialog - Toast/Notification -
CopyButton - ExternalLinkButton - ThemeToggle - UserMenu

Components must have clear props and TypeScript types. Avoid one giant
component containing all pages and business logic.

9. Frontend Technology and Code Organization
9.1 Recommended stack
React with TypeScript.
Vite.
Tailwind CSS.
React Router.
TanStack Query for API state, caching, and polling.
React Hook Form for forms.
Zod for client-side validation where useful.
Lucide React for icons.
Recharts or another lightweight chart library if real analytics
endpoints exist.
A small accessible component system (shadcn/ui or equivalent) may be
used, but maintain a consistent visual language.
Do not add dependencies without a reason. Check the existing repository
before replacing its stack.

9.2 Suggested folder structure
frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── assets/
│   ├── components/
│   │   ├── layout/
│   │   ├── common/
│   │   ├── dashboard/
│   │   ├── jobs/
│   │   └── videos/
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── searches/
│   │   ├── jobs/
│   │   ├── videos/
│   │   ├── history/
│   │   └── settings/
│   ├── hooks/
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── formatters.ts
│   │   └── validators.ts
│   ├── services/
│   ├── types/
│   ├── styles/
│   └── main.tsx
├── .env.example
├── .gitignore
├── package.json
└── README.md
Feature folders should own their page components, API hooks, schemas,
and feature-specific types where practical.

9.3 TypeScript requirements
Use TypeScript strict mode.
Define API response interfaces/types.
Avoid any; use unknown for untrusted raw payloads.
Keep backend DTO types separate from UI view-model types when
necessary.
Handle nullable/missing provider fields explicitly.
Do not assume optional metadata exists.
10. API Integration Requirements
10.1 API base URL
Configure the backend base URL using a Vite environment variable, for
example:

VITE_API_BASE_URL=http://localhost:8000/api/v1
Only public frontend configuration may use VITE_ variables. Never put
Bright Data tokens or other secrets in Vite environment variables.

10.2 API client
Create one centralized API client that handles: - Base URL. - JSON
serialization. - Credentials/session behavior according to backend
auth. - Consistent error parsing. - Request cancellation where
appropriate. - Timeout handling. - Typed responses.

Do not write raw fetch() calls independently across every component.

10.3 Expected frontend API usage
Page/action Backend API

Login Backend-defined auth endpoint

Overview Dashboard metrics endpoint, or documented
aggregate endpoints

Create search POST /api/v1/search-jobs

List jobs GET /api/v1/search-jobs

Job detail GET /api/v1/search-jobs/{job_id}

Job progress GET /api/v1/search-jobs/{job_id}/progress

Job results GET /api/v1/search-jobs/{job_id}/videos

Video detail GET /api/v1/videos/{video_id}

Export GET /api/v1/search-jobs/{job_id}/videos/export

Retry job POST /api/v1/search-jobs/{job_id}/retry

Cancel job POST /api/v1/search-jobs/{job_id}/cancel
The backend PRD is authoritative. If an endpoint is not implemented,
show a disabled/unfinished feature only where appropriate; do not fake a
successful response.

10.4 Polling and cache behavior
Poll active job progress at a controlled interval, such as every
3--5 seconds, subject to backend load.
Stop polling for terminal statuses.
Avoid overlapping requests.
Pause or reduce polling when the tab is hidden.
Invalidate relevant queries after creating, retrying, or canceling a
job.
Cache completed job details/results appropriately.
Use server pagination and stable query keys.
Show stale data clearly if a refresh fails; do not silently present
stale data as live.
11. Data Display and Formatting
11.1 Number formatting
Use locale-aware number formatting.
Compact values may show 268K or 1.2M.
Provide exact values in accessible text/tooltips.
Missing metrics show "Not available".
Never convert missing values to zero.
11.2 Dates
Display a readable date and time.
Use the user's locale/timezone for display.
Preserve UTC timestamps from the API.
Where date cutoff matters, show the exact cutoff or timezone
context.
11.3 URLs
Use the canonical original TikTok URL supplied by the backend.
Validate hostnames before treating a URL as a trusted TikTok link.
Open external links safely in a new tab.
Provide copy-link action.
If unavailable, show an explicit unavailable state.
11.4 Language labels
Never display only a generic "Russian" badge when the evidence is
ambiguous. Prefer: - Russian --- description. - Russian --- subtitle. -
Russian --- spoken audio verified. - Language unverified. - Language
mismatch.

11.5 Status labels
Map backend enum values to user-friendly labels, but preserve the
underlying status. Unknown statuses should display a safe neutral label
such as "Unknown status" rather than breaking the page.

12. Responsive Design Requirements
Test at minimum: - Small mobile: 320--375 px. - Standard mobile:
390--430 px. - Tablet: 768 px. - Laptop: 1280--1440 px. - Large desktop:
1920 px.

Acceptance: - No unintended horizontal page overflow. - Sidebar becomes
a drawer or compact navigation on mobile. - Forms stack appropriately. -
Cards adapt columns based on available width. - Tables are transformed
or intentionally scrollable. - Detail page media and metadata remain
readable. - Modals fit within viewport and can scroll. - Touch targets
are comfortable. - Text does not overlap buttons or badges. - Important
actions remain accessible.

13. Accessibility Requirements
Use semantic HTML.
Provide labels for every form field.
Ensure keyboard navigation.
Provide visible focus states.
Use sufficient color contrast.
Do not use color alone to communicate status.
Add meaningful alt text to thumbnails.
Give icon-only buttons accessible labels.
Support reduced-motion preferences.
Ensure dialogs manage focus correctly.
Announce asynchronous status changes where appropriate.
14. Loading, Empty, Error, and Partial States
Every data-driven page must handle these states.

Loading
Use skeletons shaped like the eventual content.
Avoid full-page spinners for small updates.
Disable actions that cannot safely be repeated.
Empty
Explain why there is no data.
Provide a useful next action.
Do not display fake example records as live results.
Error
Show a concise message.
Offer retry when appropriate.
Keep diagnostic details out of normal user UI.
Do not erase existing data when refresh fails.
Partial result
Show requested target and actual matches.
Explain the shortfall if backend supplies a reason.
Make clear that filters were not weakened.
Unverified language
Use a neutral/warning style.
Explain evidence is insufficient.
Do not style unverified records as confirmed matches.
15. Security Requirements
Never call Bright Data directly from React.
Never include provider tokens in frontend source or environment
variables.
Use backend authentication.
Do not store passwords in browser storage.
Prefer secure HttpOnly cookies if backend supports them.
Configure API requests to send credentials only as required by
backend.
Protect authenticated routes.
Handle expired sessions safely.
Avoid rendering provider descriptions/raw JSON as HTML.
Sanitize user-controlled content.
Validate external link hosts.
Do not expose admin-only raw provider data to normal users.
Do not include secrets in client-side error logs.
16. Frontend Performance
Lazy-load route-level page components.
Use optimized thumbnail dimensions and lazy loading.
Avoid loading full-resolution images for every result card.
Use server pagination.
Memoize expensive transformations only when profiling justifies it.
Avoid unnecessary rerenders in large result lists.
Use stable list keys.
Debounce search inputs where useful.
Avoid downloading all job results just to compute dashboard metrics.
Use loading skeletons and progressive rendering.
17. Testing Requirements
17.1 Component tests
Test: - Status badges. - Video cards. - Video metrics formatting. -
Language evidence labels. - Search form validation. - Pagination. -
Empty/error/loading states. - External TikTok link behavior.

17.2 Page tests
Test: - Login form validation and error handling. - Dashboard metrics
from mocked API responses. - Search creation success/failure. - Job
progress polling and terminal states. - Results
filtering/sorting/pagination. - Video detail with missing optional
fields. - History search and filters. - Export link/download behavior.

17.3 Responsive and accessibility tests
Verify key pages at specified viewport widths.
Keyboard-only navigation.
Form labels and error association.
Contrast and focus states.
No horizontal overflow.
Automated accessibility scan where available.
17.4 End-to-end flows
Login.
Create a search.
View the created job.
Observe progress state changes.
Open matching results.
Open video detail.
Open original TikTok link.
Return to search history.
Export results.
Logout.
Use mocked backend fixtures for automated UI tests. Do not depend on
live Bright Data collections for every frontend test.

18. Frontend Acceptance Criteria
The frontend is accepted when:

All specified routes exist and navigation works.
Login uses the real backend auth contract; no hardcoded fake login.
Protected pages require authentication.
Dashboard values come from backend data.
User can create a search with validated criteria.
User can monitor job status without keeping the creation request
open.
Results are paginated and show useful video metadata.
Video detail displays all available fields safely.
Original TikTok link opens the exact canonical URL safely.
Missing fields display as unavailable rather than misleading
zero/blank values.
Language evidence is explicitly labeled.
History can reopen old searches.
CSV/JSON export works through the backend.
Loading, empty, error, and partial states are implemented.
Layout works at mobile, tablet, laptop, and desktop sizes.
No provider secret is present in frontend source, bundles, storage,
or network calls.
Tests pass and README explains setup.
19. Implementation Milestones for Codex
Frontend M1 --- Foundation and design system
Deliver: - React + TypeScript + Vite setup (or preserve existing
repository setup). - Tailwind and component primitives. - Router. - App
shell, sidebar, topbar, responsive navigation. - Typography, color
tokens, spacing, buttons, inputs, cards, badges. - API client
foundation. - Basic error boundary and toast system.

Acceptance: app runs, navigation/layout is responsive, design system is
consistent.

Frontend M2 --- Authentication
Deliver: - Login page. - Auth API integration. - Protected route
handling. - Session loading/expired states. - Logout. - Forgot/reset
password only if backend supports it.

Acceptance: real backend authentication works; no fake credentials or
token leakage.

Frontend M3 --- Dashboard and search creation
Deliver: - Overview dashboard. - Metric cards and recent jobs. - New
Search form. - Validation and API integration. - Search criteria
summary.

Acceptance: user can create a job from the UI and navigate to its detail
page.

Frontend M4 --- Jobs and progress
Deliver: - Active jobs list. - Job detail/progress page. - Controlled
polling. - Partial/failure/cancel/retry states.

Acceptance: job status reflects backend lifecycle accurately.

Frontend M5 --- Results and video detail
Deliver: - Video card and table modes. -
Search/filter/sort/pagination. - Video detail page. - Canonical TikTok
external link. - Metadata, category, language evidence, and raw data
access controls.

Acceptance: users can inspect complete available video information and
open the original post.

Frontend M6 --- History, exports, settings
Deliver: - Search history. - Reopen/duplicate job if supported. -
CSV/JSON export. - Profile/settings. - Optional saved videos.

Acceptance: users can return to previous work and export results.

Frontend M7 --- Polish and production readiness
Deliver: - Responsive QA. - Accessibility checks. - Performance
improvements. - Error/empty/loading state review. - End-to-end tests. -
Production environment configuration and documentation.

Acceptance: all frontend acceptance criteria pass.

20. Instructions for Codex
Treat this file as the frontend source of truth and the backend PRD as
the source of truth for API behavior and business rules.

Before coding: 1. Inspect the existing repository and current backend
API contracts. 2. Identify which backend endpoints are implemented and
which are planned. 3. Do not invent API response fields or
authentication behavior. 4. Ask for clarification if a required API
contract is missing. 5. Present a proposed frontend structure and
milestone plan before large changes.

Implementation rules: - Use React and TypeScript. - Build reusable
components and feature-based folders. - Keep API calls out of
presentation components. - Use a centralized typed API client. - Use
real backend data; do not hardcode dashboard metrics or pretend search
results. - Use mock fixtures only for development/tests and label them
clearly. - Do not call Bright Data from the browser. - Do not expose
secrets in Vite environment variables. - Follow responsive and
accessibility requirements. - Handle nullable fields and unknown enum
values safely. - Do not create nonfunctional buttons or fake features. -
Do not implement password reset, saved videos, or admin controls unless
corresponding backend support exists. - Do not claim spoken-language
verification unless the backend provides that evidence. - Keep
components focused and avoid giant page components. - Add tests as
features are implemented. - After each milestone, run lint, type checks,
and tests; report changed files and remaining blockers.

First Codex task --- Frontend M1 only
Implement only: - React + TypeScript app foundation. - Routing. -
Responsive app shell. - Sidebar/topbar/mobile navigation. - Design
tokens and reusable UI primitives. - Centralized API client skeleton. -
Toast/error boundary. - Placeholder route pages with intentional empty
states.

Do not build fake dashboard data, authentication simulation, Bright Data
integration, or search workflows in M1. First inspect the backend
contract and coordinate the next milestone.

End of Frontend PRD



⋮⋮⋮⋮⋮⋮⋮⋮