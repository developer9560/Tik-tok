import { Clapperboard } from 'lucide-react'
import { EmptyState } from '../components/common/empty-state'
import { PageHeader } from '../components/common/page-header'
import { Surface } from '../components/common/surface'

export default function LibraryPage() {
  return (
    <div className="page-stack page-stack--narrow">
      <PageHeader eyebrow="VIDEO LIBRARY" title="Review your videos" description="A clear view of discovered videos, their metadata, and the evidence attached to each match." />
      <Surface className="empty-surface">
        <EmptyState icon={<Clapperboard size={20} />} eyebrow="No video records" title="Your video library is empty." description="Video results will be shown here after search jobs, normalization, and result retrieval are available in the backend." />
      </Surface>
    </div>
  )
}
