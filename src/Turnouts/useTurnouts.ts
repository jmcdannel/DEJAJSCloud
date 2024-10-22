import { computed } from 'vue'
import {
  collection,
  serverTimestamp,
  setDoc,
  doc,
  getDoc,
} from 'firebase/firestore'
import { useStorage } from '@vueuse/core'
import { useCollection } from 'vuefire'
import { db } from '@/firebase'
import { useLayout } from '@/Layout/useLayout'
import { useDcc } from '@/DCCEX/useDcc'
import { useDejaJS } from '@/DejaJS/useDejaJS'

export function useTurnouts() {
  const layoutId = useStorage('@DEJA/cloud/layoutId', 'betatrack')
  const { getDevice } = useLayout()
  const { sendDccCommand } = useDcc()
  const { sendDejaCommand } = useDejaJS()

  const turnoutsCol = computed(() =>
    layoutId.value ? collection(db, `layouts/${layoutId.value}/turnouts`) : null
  )

  function getTurnouts() {
    const turnouts = useCollection(turnoutsCol)
    return turnouts
  }

  async function getTurnout(id: string) {
    const deviceRef = doc(db, `layouts/${layoutId.value}/turnouts`, id)
    const docSnap = await getDoc(deviceRef)

    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id }
    } else {
      console.error('No such document!')
    }
  }

  async function switchTurnout(turnout) {
    console.log('switchTurnout SEND', turnout, turnout?.id)

    try {
      const device = await getDevice(turnout['device'])
      console.log('device', device, device?.type)
      // if (turnout?.effectId) {
      //   await runEffect(await turnout.effectId)
      // }
      if (device?.type === 'dcc-ex') {
        sendDccCommand({
          action: 'turnout',
          payload: { turnoutId: turnout.turnoutIdx, state: !turnout.state },
        })
      } else if (device?.type === 'deja-arduino') {
        sendDejaCommand({
          action: 'turnouts',
          payload: { ...turnout, id: turnout?.id },
        })
      }
    } catch (e) {
      console.error('Error adding document: ', e)
    }
  }

  async function setTurnout(id, turnout) {
    console.log('createTurnout', turnout)
    try {
      await setDoc(doc(db, `layouts/${layoutId.value}/turnouts`, id), {
        ...turnout,
        timestamp: serverTimestamp(),
      })
      // T 200 SERVO 200 200 300 2
      const device = await getDevice(turnout['device'])
      console.log('device', device, device?.type)

      if (device?.type === 'dcc-ex') {
        sendDccCommand({
          action: 'dcc',
          payload: `T ${turnout.turnoutIdx} SERVO ${turnout.turnoutIdx} ${turnout.straight} ${turnout.divergent} 2`,
        })
      }
      return true
    } catch (e) {
      console.error('Error adding throttle: ', e)
    }
  }

  return {
    getTurnouts,
    getTurnout,
    switchTurnout,
    setTurnout,
  }
}

export default useTurnouts
