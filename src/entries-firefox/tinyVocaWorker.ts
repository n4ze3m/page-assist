import { startTinyVocaWorker } from "@/workers/tiny-voca.worker"

// Built as a plain extension file so that `new Worker("/tinyVocaWorker.js")`
// loads it from the extension itself, in dev as well as in a release build.
export default defineUnlistedScript(() => {
  startTinyVocaWorker()
})
