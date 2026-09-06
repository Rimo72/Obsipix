import '@testing-library/jest-dom/vitest';

// jsdom has no real canvas. Return null quietly so renderer code takes its
// "context unavailable" path instead of jsdom logging "Not implemented".
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext;
