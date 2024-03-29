/** gptlint-disable */

declare module 'ts-progress' {
  export interface ProgressOptions {
    total: number
    pattern?: string
    textColor?: string
    title?: string
    updateFrequency?: number
  }

  export interface Progress {
    /**
     * Updates progress
     */
    update()

    /**
     * Finishes progress
     */
    done()
  }

  let progress: {
    /**
     * Creates new progress bar object
     * @param options {ProgressOptions}
     * @returns {Progress}
     */
    create(options: ProgressOptions): Progress
  }

  export default progress
}
