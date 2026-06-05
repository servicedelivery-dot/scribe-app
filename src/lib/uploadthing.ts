import { createUploadthing, type FileRouter } from 'uploadthing/next'

const f = createUploadthing()

export const ourFileRouter = {
  screenshotUploader: f({ image: { maxFileSize: '8MB', maxFileCount: 10 } })
    .middleware(async () => ({ userId: 'unused' }))
    .onUploadComplete(() => {}),

  // For LMS lesson imports
  lessonFileUploader: f({
    pdf: { maxFileSize: '32MB', maxFileCount: 1 },
    'application/msword': { maxFileSize: '16MB', maxFileCount: 1 },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { maxFileSize: '16MB', maxFileCount: 1 },
    text: { maxFileSize: '4MB', maxFileCount: 1 },
    image: { maxFileSize: '8MB', maxFileCount: 1 },
  })
    .middleware(async () => ({ userId: 'unused' }))
    .onUploadComplete(async ({ file }) => {
      return { url: file.url, name: file.name, type: file.type }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
