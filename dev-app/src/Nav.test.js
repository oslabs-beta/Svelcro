import { render, screen } from '@testing-library/svelte';
import nav from './components/nav.svelte';

describe('Nav component tests: ', () => {
  it('Navbar is mounted when nav component is rendered', () => {
    render(nav);
    const navBar = screen.queryByTestId('nav-bar');
    expect(navBar).toBeInTheDocument();
  });

  it('Component button is mounted when nav component is rendered', () => {
    render(nav);
    const compButton = screen.queryByTestId('comp-button');
    expect(compButton).toBeInTheDocument();
  });

  it('Profiler button is mounted when nav component is rendered', () => {
    render(nav);
    const profilerButton = screen.queryByTestId('profiler-button');
    expect(profilerButton).toBeInTheDocument();
  });
})
