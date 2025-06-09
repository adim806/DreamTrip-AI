import { render, screen, fireEvent } from '@testing-library/react';
import { jest, describe, it, expect } from '@jest/globals';

// Simple button component for testing
const Button = ({ onClick, children, disabled }) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    data-testid="test-button"
  >
    {children}
  </button>
);

describe('Button Component', () => {
  it('renders with the correct text', () => {
    render(<Button>Click me</Button>);
    const buttonElement = screen.getByTestId('test-button');
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement.textContent).toBe('Click me');
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    const buttonElement = screen.getByTestId('test-button');
    
    fireEvent.click(buttonElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled={true}>Click me</Button>);
    const buttonElement = screen.getByTestId('test-button');
    expect(buttonElement).toBeDisabled();
  });
}); 