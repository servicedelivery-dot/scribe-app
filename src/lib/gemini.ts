import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Fallback chain — tries each model in order until one works
const MODEL_CHAIN = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
]

function isRetryable(message: string) {
  return message.includes('503') || message.includes('overloaded') ||
    message.includes('high demand') || message.includes('429') ||
    message.includes('UNAVAILABLE')
}

export async function generateWithRetry(parts: unknown[]): Promise<string> {
  let lastError: unknown

  for (const modelName of MODEL_CHAIN) {
    console.log(`Trying model: ${modelName}`)
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(parts as Parameters<typeof model.generateContent>[0])
      console.log(`Success with model: ${modelName}`)
      return result.response.text()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      lastError = err

      if (isRetryable(message)) {
        console.log(`Model ${modelName} overloaded, trying next...`)
        await new Promise(r => setTimeout(r, 2000))
        continue
      }

      // Non-retryable error (auth, bad request, etc) — throw immediately
      throw err
    }
  }

  throw lastError ?? new Error('All Gemini models are currently unavailable. Please try again in a minute.')
}
