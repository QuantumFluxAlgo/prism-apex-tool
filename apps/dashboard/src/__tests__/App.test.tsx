 
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

 
import App from '../App';

describe('App', () => {
  it('renders dashboard title', () => {
    render(<App />);
    expect(screen.getByText(/Prism Apex Operator Dashboard/)).toBeInTheDocument();
  });
});
