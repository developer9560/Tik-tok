import { describe, expect, it, vi } from 'vitest'
import { getExportUrl, getSearchVideos } from './api-client'

describe('video result requests', () => {
  it('requests every collected decision by default and includes the search query', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], page: 1, page_size: 50, total: 0, total_pages: 0 })),
    )
    vi.stubGlobal('fetch', fetchMock)

    try {
      await getSearchVideos('job/id', 1, 'views', 'all', 'football')
      expect(fetchMock).toHaveBeenCalledOnce()
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        'http://localhost:8000/api/v1/search-jobs/job%2Fid/videos?page=1&page_size=50&sort_by=views&order=desc&decision=all&search=football',
      )
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('builds a JSON download URL with the selected decision and search', () => {
    expect(getExportUrl('job/id', 'json', 'all', 'football & friends')).toBe(
      'http://localhost:8000/api/v1/search-jobs/job%2Fid/videos/export?output_format=json&decision=all&search=football+%26+friends',
    )
  })

  it('builds a CSV download URL for a selected decision', () => {
    expect(getExportUrl('job-1', 'csv', 'rejected')).toBe(
      'http://localhost:8000/api/v1/search-jobs/job-1/videos/export?output_format=csv&decision=rejected',
    )
  })
})
