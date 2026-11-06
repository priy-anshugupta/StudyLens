class StudyLensRecorder extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]?.[0];
    if (input) this.port.postMessage(input.slice().buffer);
    return true;
  }
}
registerProcessor("studylens-recorder", StudyLensRecorder);
