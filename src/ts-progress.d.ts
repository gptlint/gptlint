interface ProgressOptions {
  total: number
  pattern?: string
  textColor?: string
  title?: string
  updateFrequency?: number
}

interface Progress {
  /**
   * Updates progress
   */
  update()

  /**
   * Finishes progress
   */
  done()
}

declare module 'ts-progress' {
  let progress: {
    /**
     * Creates new progress bar object
     * @param options {ProgressOptions}
     * @returns {Progress}
     */
    create(options: ProgressOptions): Progress
  }

  export = progress
}
