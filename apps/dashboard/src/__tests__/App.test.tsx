/* eslint-disable simple-import-sort/imports */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

// eslint-disable-next-line import/no-unresolved
import App from '../App.js';

describe('App', () => {
  it('renders dashboard title', () => {
    render(<App />);
    expect(screen.getByText(/Prism Apex Operator Dashboard/)).toBeInTheDocument();
  });
});
