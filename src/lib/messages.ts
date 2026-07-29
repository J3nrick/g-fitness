import type { CoachingStyle } from '../types/database.types'

export type MessageEvent =
  | 'welcome'
  | 'first_workout'
  | 'workout_started'
  | 'workout_finished'
  | 'personal_record'
  | 'rest_day'
  | 'missed_workout'
  | 'meal_logged'
  | 'water_goal'
  | 'weight_logged'
  | 'streak_3'
  | 'streak_7'
  | 'streak_14'
  | 'streak_30'
  | 'katamad_done'
  | 'set_done'
  | 'protein_hit'
  | 'sleep_hit'
  | 'morning'
  | 'afternoon'
  | 'late_night'
  | 'saved'
  | 'deleted'
  | 'scan_success'
  | 'scan_failed'
  | 'plan_generated'

type Intensity = 'mild' | 'medium' | 'unfiltered'

const POOL: Record<MessageEvent, Record<CoachingStyle, string[]>> = {
  welcome: {
    chill: [
      'Welcome back. Let\'s build consistency.',
      'Ready to move today.',
      'Another day, another step forward.',
    ],
    tropa: [
      'Uy, G! Tara na.',
      'Hoy, balik na! Tara workout.',
      'Andyan ka na pala. Tara, simulan na natin.',
      'Nandito na! G na G.',
    ],
    real_talk: [
      'Tangina, bumalik ka rin. G na.',
      'Hoy gago, bangon. Workout na.',
      'Ayan ka na naman. At least pumasok ka. G!',
      'Puta, akala ko di ka na babalik. Tara.',
    ],
  },
  first_workout: {
    chill: [
      'First workout logged. This is where it begins.',
      'Day one is done. Keep going.',
    ],
    tropa: [
      'Unang workout mo! Panalo, tropa.',
      'Day 1 in the books. Tuloy lang.',
    ],
    real_talk: [
      'Tangina, nagsimula ka na! Yan ang kailangan.',
      'Unang buhat! Gago, proud ako sa\'yo.',
    ],
  },
  workout_started: {
    chill: [
      'Workout started. Focus and finish.',
      'Let\'s go. One set at a time.',
      'Time to work. You showed up — that\'s half the battle.',
    ],
    tropa: [
      'Tara na! Wala nang maraming satsat.',
      'Game na. Unang set pa lang yan.',
      'Kilos na, tropa. Wag puro cellphone.',
      'Let\'s go! Hindi ka papalakihin ng kakaisip.',
    ],
    real_talk: [
      'Tangina, simulan na natin.',
      'Kilos na. Hindi ka gagalaw mag-isa.',
      'Tara na, gago. Wala nang reklamo.',
      'G na G. Buhat na, wag paarte.',
      'Puta, workout na. Hindi ka papayat sa kaka-scroll.',
    ],
  },
  workout_finished: {
    chill: [
      'Session complete. Rest and recover.',
      'Good work today. Consistency wins.',
      'Done. Progress is built one session at a time.',
    ],
    tropa: [
      'Solid! Isa na namang panalo.',
      'Tapos na! Hindi ka nagpatalo ngayon.',
      'Ayos yan. Bukas ulit, tropa.',
      'Panalo! Ganyan dapat, tuloy-tuloy lang.',
    ],
    real_talk: [
      'Tangina, tapos na! Solid.',
      'Good shit. Bukas ulit.',
      'Lakas! Tuloy-tuloy lang, gago.',
      'Puta, ang lakas mo ngayon ah. Ganyan!',
      'Tangina, kinaya mo. Respeto.',
    ],
  },
  personal_record: {
    chill: [
      'New personal record. Quiet strength.',
      'PR achieved. Your consistency is paying off.',
    ],
    tropa: [
      'PR! Ang lakas mo today, pre.',
      'PR na naman? Halimaw ka talaga.',
      'Bagong record! Hindi na beginner yan.',
    ],
    real_talk: [
      'Gago, lumakas ka ah!',
      'PR na naman? Halimaw.',
      'Tangina, ibang level na yan.',
      'Hindi ka na beginner. PR nanaman, gago.',
      'Yan ang bunga ng consistency, tangina.',
    ],
  },
  rest_day: {
    chill: [
      'Rest day. Recovery is part of the process.',
      'Take it easy today. You\'ve earned it.',
    ],
    tropa: [
      'Rest day muna. Pahinga para mas malakas bukas.',
      'Walang workout today — pero hydrate ka pa rin.',
    ],
    real_talk: [
      'Pahinga muna, gago. Hindi bakal katawan mo.',
      'Rest day. Pero wag mo akong lokohin — babalik ka bukas.',
      'Magpahinga ka. Pero tangina, huwag mong gawing habit.',
    ],
  },
  missed_workout: {
    chill: [
      'Missed a day. It happens. Show up tomorrow.',
      'No workout logged. One day won\'t break your streak if you come back.',
    ],
    tropa: [
      'Hoy, dalawang araw ka nang absent. G?',
      'Hindi ka gagalaw kung puro dahilan.',
      'Bawi tayo ngayon. Huwag na bukas.',
      'Limang minuto lang. Simulan mo na.',
    ],
    real_talk: [
      'Hoy gago, dalawang araw ka nang nawawala.',
      'Tangina, tamad ka na naman? Bumangon ka.',
      'Puta, wag kang mag-dahilan. Cinco minutos lang.',
      'Wala kang galaw kahapon. Ang hina. Babawi ka ba?',
      'Hindi ka gagalaw kung puro kaartehan. G na.',
    ],
  },
  meal_logged: {
    chill: [
      'Meal logged. Tracking is progress.',
      'Food recorded. Stay on target.',
    ],
    tropa: [
      'Kain logged. Tuloy lang!',
      'Ayos. Hindi puro instant noodles.',
      'Kumpleto ang lamon. Nice.',
      'Protein muna bago cheat meal, tropa.',
    ],
    real_talk: [
      'Panalo yan. Hindi puro jollibee.',
      'Tangina, naglo-log ka ng pagkain? Seryoso ka na ah.',
      'Ayos. Tuloy lang, isang meal at a time.',
      'Kumpleto ang macros? Gago, impressed ako.',
    ],
  },
  water_goal: {
    chill: [
      'Water goal hit. Great hydration.',
      'Hydration on point. Keep it up.',
    ],
    tropa: [
      'Lakas uminom ng tubig! Wag lang puro kape ha.',
      'Water goal met! Tuloy lang, tropa.',
      'Hydrated ka na. Ayos yan.',
    ],
    real_talk: [
      'Inom pa ng tubig, gago. Tuyo na utak mo.',
      'Water goal done. Hindi naman mahirap diba? Tubig lang yan.',
      'Ayos. Tubig muna bago Red Bull.',
    ],
  },
  weight_logged: {
    chill: [
      'Weight recorded. Track the trend, not the day.',
      'Logged. Consistency in tracking matters.',
    ],
    tropa: [
      'Timbang saved. Harapin mo yan, tropa.',
      'Weight logged! Ang mahalaga, hinarap mo.',
    ],
    real_talk: [
      'Timbang saved. Wag matakot sa weighing scale, gago.',
      'Tangina, at least hinarap mo. Yan ang simula.',
    ],
  },
  streak_3: {
    chill: [
      '3-day streak. Building momentum.',
      'Three days in. Keep the rhythm.',
    ],
    tropa: [
      '3-day streak! Tuloy-tuloy, tropa.',
      'Tatlong araw na! Wag mong putulin.',
    ],
    real_talk: [
      'Tatlong araw. Simula pa lang pero G ka na.',
      'Tangina, tuloy-tuloy ah. Wag mong sirain.',
    ],
  },
  streak_7: {
    chill: [
      '7-day streak. Outstanding consistency.',
      'One full week. This is discipline.',
    ],
    tropa: [
      '7-day streak! Solid bro, ginagalingan mo ah.',
      'Isang linggo na! Hindi mo na kailangan ng motivation.',
    ],
    real_talk: [
      '7-day streak! Tangina, sinisipag ka ah.',
      'Isang linggo? Gago, respeto. Patunayan mong hindi chamba.',
      'Tangina, tuloy-tuloy! Disiplina na to, hindi motivation.',
    ],
  },
  streak_14: {
    chill: [
      '14-day streak. You\'re building a real habit.',
      'Two weeks. This is becoming who you are.',
    ],
    tropa: [
      '14 days! Tropa, hindi ka na nagpapadala sa tamad.',
      'Dalawang linggo na consistent. Ibang klase ka na.',
    ],
    real_talk: [
      '14 araw? Tangina, walang makakapigil sa\'yo.',
      'Gago, dalawang linggo na. Beast mode na to.',
    ],
  },
  streak_30: {
    chill: [
      '30-day streak. Remarkable discipline.',
      'One full month. You\'ve proven yourself.',
    ],
    tropa: [
      '30 araw! Isang buwan kang consistent. Legend.',
      'Tropa, isang buwan na. Respeto talaga.',
    ],
    real_talk: [
      'Tangina, isang buwan kang consistent. RESPETO.',
      '30 days. Gago, hindi ka na yung dating tamad.',
      'Isang buwan. Tangina, malakas ka na. Wag huminto.',
    ],
  },
  katamad_done: {
    chill: [
      'Minimum dose complete. You still showed up.',
      'Even a small workout counts. Well done.',
    ],
    tropa: [
      'Tinamad pero gumalaw. Panalo pa rin.',
      'Kahit tinamad ka, gumalaw ka pa rin. Solid.',
      'Katamad done! Mas magaling ka pa rin kaysa sa walang ginawa.',
    ],
    real_talk: [
      'Tangina, kahit tinamad ka gumalaw ka pa rin. Respeto.',
      'Minimum dose pero nag-effort ka. Hindi ka hopeless.',
      'Puta, at least may ginawa ka. Mas matapang ka kaysa sa 90%.',
    ],
  },
  set_done: {
    chill: [
      'Set complete.',
      'Done. Next.',
      'One more down.',
    ],
    tropa: [
      'Set done! Isa pa, tropa.',
      'Ayos! Next set.',
      'Panalo yan. Continue.',
      'Isa pa!',
    ],
    real_talk: [
      'Set done, gago. Isa pa.',
      'Tangina, dagdag pa.',
      'Ayos. Huwag huminto.',
      'Isa pa. Wag kang tumigil.',
    ],
  },
  protein_hit: {
    chill: [
      'Protein target met. Muscles will thank you.',
      'Protein goal hit. Recovery fuel in.',
    ],
    tropa: [
      'Protein goal hit! Hindi puro kanin ah.',
      'Ayan, protein. Muscles mo nag-pe-party na.',
    ],
    real_talk: [
      'Tangina, naabot mo protein goal. Hindi ka pa rin puro kanin.',
      'Protein hit. Gago, ang disciplined mo na ah.',
    ],
  },
  sleep_hit: {
    chill: [
      'Sleep goal checked. Recovery is essential.',
      'Rest well. The body rebuilds during sleep.',
    ],
    tropa: [
      'Sleep marked! Recovery mode activated, tropa.',
      'Tulog na. Bawi muscles.',
    ],
    real_talk: [
      'Matulog ka na, gago. Hindi ka gagalaw ng maayos kung puyat ka.',
      'Sleep goal done. Tangina, at least isa kang natutulog nang maayos.',
    ],
  },
  morning: {
    chill: [
      'Good morning. New day, new opportunity.',
      'Morning. What matters today is showing up.',
      'Fresh start today. Let\'s go.',
    ],
    tropa: [
      'Magandang umaga! Tara, bakal na.',
      'Uy gising na! Wag puro kape, workout din.',
      'Morning, tropa! G na ba?',
    ],
    real_talk: [
      'Gago, bangon! Hindi gagalaw ang timbang mo sa pag-escroll.',
      'Magandang umaga, tangina. Workout na.',
      'Umaga na. Wag nang tamarin. G na.',
    ],
  },
  afternoon: {
    chill: [
      'Afternoon check. Have you moved today?',
      'Half the day is done. Make the rest count.',
    ],
    tropa: [
      'Tanghali na, tropa! Na-workout ka na ba?',
      'Hapon na. Wag mong i-skip yung workout.',
    ],
    real_talk: [
      'Tangina, hapon na wala ka pang ginagawa.',
      'Gago, half day na. Gumalaw ka na ba?',
    ],
  },
  late_night: {
    chill: [
      'Late night. Get it done and rest well.',
      'Night session. Finish strong and sleep.',
    ],
    tropa: [
      'Gabi na ah! Mag-workout ka na para makatulog.',
      'Late session? Sige, basta matulog ka after.',
    ],
    real_talk: [
      'Gabi na, gago. Mag-workout ka na para makatulog ka na.',
      'Tangina, gabi na wala ka pang buhat? Tara na!',
      'Puta, puyat ka na naman. Mag-workout ka at matulog ka na.',
    ],
  },
  saved: {
    chill: ['Saved.', 'Changes saved.', 'Done and saved.'],
    tropa: ['Saved. G!', 'Na-save na. Walang drama.', 'Ayos, saved.'],
    real_talk: ['Saved, gago.', 'Done. Wala nang drama.', 'Na-save na. G!'],
  },
  deleted: {
    chill: ['Removed.', 'Deleted.'],
    tropa: ['Gone. Next.', 'Deleted na. Move on.'],
    real_talk: ['Binura na. Wala na yan.', 'Deleted. Bye.'],
  },
  scan_success: {
    chill: [
      'Food detected. Review and save.',
      'Scan complete. Check the results.',
    ],
    tropa: [
      'Na-detect agad! Pindutin mo na para ma-record.',
      'Scan done! Tama ba? I-save mo na.',
    ],
    real_talk: [
      'Tangina, na-detect agad. Save mo na.',
      'Ayos, na-scan na. Wag mong kalimutang i-log.',
    ],
  },
  scan_failed: {
    chill: [
      'Couldn\'t read the image. Try again with better lighting.',
      'Scan failed. You can add manually instead.',
    ],
    tropa: [
      'Di ko mabasa yung pagkain, tropa. Subukan mo ulit.',
      'Hindi klaro. Picturan mo ulit nang malinaw.',
    ],
    real_talk: [
      'Di ko mabasa yung pagkain, gago. Alin ba talaga yan?',
      'Puta, blurred. Picturan mo ulit.',
    ],
  },
  plan_generated: {
    chill: [
      'Your workout plan has been generated.',
      'Plan ready. Follow it consistently.',
    ],
    tropa: [
      'Plan generated! Sundan mo lang, tropa.',
      'Workout plan na-build na. Wala nang excuses.',
    ],
    real_talk: [
      'Plan done. Tangina, sundan mo na lang. Wala nang dahilan.',
      'Na-generate na ang plan mo. Huwag mong i-ignore, gago.',
    ],
  },
}

const usedMessages = new Map<string, Set<number>>()

function getUsedKey(event: MessageEvent, style: CoachingStyle): string {
  return `${event}__${style}`
}

export function getMessage(
  event: MessageEvent,
  style: CoachingStyle,
  _intensity?: Intensity,
): string {
  const messages = POOL[event]?.[style]
  if (!messages || messages.length === 0) return 'G!'

  const key = getUsedKey(event, style)
  let used = usedMessages.get(key)
  if (!used || used.size >= messages.length) {
    used = new Set()
    usedMessages.set(key, used)
  }

  const available = messages.map((_, i) => i).filter((i) => !used!.has(i))
  const idx = available[Math.floor(Math.random() * available.length)]
  used.add(idx)

  return messages[idx]
}

export function getCoachingStyle(): CoachingStyle {
  try {
    const raw = localStorage.getItem('g_coaching_style')
    if (raw === 'chill' || raw === 'tropa' || raw === 'real_talk') return raw
  } catch { /* noop */ }
  return 'tropa'
}

export function setCoachingStyle(style: CoachingStyle) {
  localStorage.setItem('g_coaching_style', style)
}

export function getIntensity(): Intensity {
  try {
    const raw = localStorage.getItem('g_intensity')
    if (raw === 'mild' || raw === 'medium' || raw === 'unfiltered') return raw
  } catch { /* noop */ }
  return 'medium'
}

export function setIntensity(intensity: Intensity) {
  localStorage.setItem('g_intensity', intensity)
}
