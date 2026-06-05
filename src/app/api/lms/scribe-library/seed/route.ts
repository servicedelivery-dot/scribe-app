import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsScribeLibrary } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const BASE = 'https://scribehow.com/embed/'

function urls(slug: string) {
  return {
    slidesUrl: `${BASE}${slug}`,
    movieUrl: `${BASE}${slug}?as=video`,
    scrollUrl: `${BASE}${slug}?as=scrollable`,
  }
}

const SCRIBE_LESSONS = [
  { title: 'Split Injection – Red Path',                                                          courseGroup: 'RED Path Injection Process',                      ...urls('Split_Injection__Red_Path__Ln6OfZ6dSLK7HVVxCzhiQw') },
  { title: 'Feedback',                                                                             courseGroup: null,                                              ...urls('Feedback__fSfNDgblSsqo8d0Be6vM1w') },
  { title: 'Record damage after acceptance/collection',                                            courseGroup: 'RED Path Injection Process',                      ...urls('Record_damage_after_acceptancecollection__ASuuroA6QAa4_YhqPep3PQ') },
  { title: 'ABC Injection with DCS link',                                                          courseGroup: 'ABC with DCS Injection Green Path',               ...urls('ABC_Injection_with_DCS_link__1S1Zkn6GTSW6pAWa9KuOyA') },
  { title: 'Download the Airportr App',                                                            courseGroup: 'Downloading Apps and Link  - iOS & Android',      ...urls('Download_the_Airportr_App__9D8r9MTSTCSZRTMREbHnCg') },
  { title: 'Red Path Conditional acceptance booking injection',                                    courseGroup: 'RED Path Injection Process',                      ...urls('Red_Path_Conditional_acceptance_booking_injection__RN-0wlrZTh-p5yuAEPYQfg') },
  { title: 'ABC Injection without DCS link',                                                       courseGroup: 'ABC  Non DCS Injection Green Path',               ...urls('ABC_Injection_without_DCS_link__u2GomqdHS6OwFQaFepe3Zw') },
  { title: 'Conditional Acceptance',                                                               courseGroup: 'ABC Door Acceptance Green Path',                  ...urls('Conditional_Acceptance__we4jKCMmSkymVscFJJvJAA') },
  { title: 'ABC Doorstep Acceptance / Collection – Green Path with multiple passengers',           courseGroup: 'ABC Door Acceptance Green Path',                  ...urls('ABC_Doorstep_Acceptance__Collection__Green_Path_with_multiple_passengers__DC7D-y92SQS_PqQ-h9PNog') },
  { title: 'Give or take custody of bag',                                                          courseGroup: 'ABC Door Acceptance Green Path',                  ...urls('Give_or_take_custody_of_bag__oOgSx8xyS76hrq1ViQ9NKg') },
  { title: 'Disable DCS Link Red path',                                                            courseGroup: 'Red Path ABC Acceptance and Collection Guide',    ...urls('Disable_DCS_Link_Red_path__n-WM61coRxulY45IywotRg') },
  { title: 'Repatriation Red Path',                                                                courseGroup: 'RED Path Injection Process',                      ...urls('Repatriation_Red_Path__piJN8ckTS-ekfs6sBOvONg') },
  { title: 'Excess Charge process',                                                                courseGroup: 'RED Path Injection Process',                      ...urls('Excess_Charge_process__HB9o_D87RaWGMZCBk0R3DQ') },
  { title: 'Driver Summary',                                                                       courseGroup: 'Airportr Dashboard',                              ...urls('Driver_Summary__fOENjtWxTrCttzMoSdTHxA') },
  { title: 'Reassign Booking',                                                                     courseGroup: 'RED Path Injection Process',                      ...urls('Reassign_Booking__kGM7VdC0SNuhNb323XzlGg') },
  { title: 'Onfleet App',                                                                          courseGroup: 'Onfleet Training',                                ...urls('Onfleet_App__YGq-CaFoQPOjT9NVohNHTQ') },
  { title: 'Red Path ABC Acceptance and Collection Guide',                                         courseGroup: 'Red Path ABC Acceptance and Collection Guide',    ...urls('Red_Path_ABC_Acceptance_and_Collection_Guide__BOqSb-_fQ_WnuA1m9zUGqA') },
  { title: 'ABC Doorstep Acceptance / Collection – Green Path 1 customer and 2 bag process',      courseGroup: 'ABC Door Acceptance Green Path',                  ...urls('ABC_Doorstep_Acceptance__Collection__Green_Path_1_customer_and_2_bag_process__ZkpSZM0ESsyRDCE-2-UysQ') },
  { title: 'ABC Doorstep Acceptance / Collection – Green Path 1 customer and 1 bag process',      courseGroup: 'ABC Door Acceptance Green Path',                  ...urls('ABC_Doorstep_Acceptance__Collection__Green_Path_1_customer_and_1_bag_process__xEr0Nkf9T_uMln_35TM81g') },
  { title: 'Order of injecting luggage',                                                           courseGroup: 'Airportr Information ( All )',                    ...urls('Order_of_injecting_luggage__tbiSM6miRQqnNMN3DPR1QA') },
  { title: 'How To Sign In To Your Onfleet Account',                                              courseGroup: 'Downloading Apps and Link  - iOS & Android',      ...urls('How_To_Sign_In_To_Your_Onfleet_Account__6wwRB0I2Q0mEfoe3pE-N_w') },
  { title: 'How To Log In To The Airportr Agent Dashboard',                                       courseGroup: 'Downloading Apps and Link  - iOS & Android',      ...urls('How_To_Log_In_To_The_Airportr_Agent_Dashboard__G9Iv-i2ESw6TyuFhzbmDBg') },
  { title: 'Luggage guide',                                                                        courseGroup: 'Luggage',                                         ...urls('Luggage_guide__FZwTKzupS66VB0MEUaUt7A') },
  { title: 'Place bag in storage',                                                                 courseGroup: 'ABC Door Acceptance Green Path',                  ...urls('Place_bag_in_storage__cn9Kuhw0Qw2itnP5F0xpbg') },
  { title: 'Accessing AirPortr Booking Manifest Details',                                         courseGroup: 'Airportr Dashboard',                              ...urls('Accessing_AirPortr_Booking_Manifest_Details__RQIdbIcrTze7LNcbw45T3A') },
].map((item, i) => ({ ...item, orderIndex: i }))

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.select().from(lmsScribeLibrary)
  const existingByTitle = new Map(existing.map(e => [e.title, e]))

  // Update courseGroup for existing items and insert new ones
  let added = 0
  for (const lesson of SCRIBE_LESSONS) {
    const match = existingByTitle.get(lesson.title)
    if (match) {
      await db.update(lmsScribeLibrary)
        .set({ courseGroup: lesson.courseGroup ?? null })
        .where(eq(lmsScribeLibrary.id, match.id))
    } else {
      await db.insert(lmsScribeLibrary).values(lesson)
      added++
    }
  }

  const total = await db.select().from(lmsScribeLibrary)
  return NextResponse.json({ seeded: total.length, added })
}
