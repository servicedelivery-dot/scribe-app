import { NextResponse } from 'next/server'

// Returns non-sensitive AI configuration so the standalone HTML LMS can use
// the same AI key without the user having to re-enter it.
// The Gemini key is scoped to AI generation only — not database credentials.
export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY ?? ''

  const res = NextResponse.json({ geminiApiKey: geminiKey })

  // Allow the HTML LMS on any origin to fetch this (internal tool)
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET')

  return res
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  })
}
