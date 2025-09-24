import React from 'react'
import ReviewPage from './ReviewPage'

// View Media page (analysis-style). This clones the Review & Analyze UI
// for users who prefer that workflow under the "View Media" entry.
const ViewMediaPage: React.FC = () => {
  return <ReviewPage allowGeneration={false} />
}

export default ViewMediaPage
