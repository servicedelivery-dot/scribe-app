export type OutputFormat = 'course' | 'guide' | 'article'

export interface Project {
  id: string
  userId: string
  title: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ContentItem {
  id: string
  projectId: string
  userId: string
  type: 'image' | 'note'
  content: string | null
  storageKey: string | null
  publicUrl: string | null
  orderIndex: number
  createdAt: Date
}

export interface GeneratedContent {
  id: string
  projectId: string
  userId: string
  format: OutputFormat
  title: string
  body: string
  createdAt: Date
}
