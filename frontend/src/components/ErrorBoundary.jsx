import { Component } from 'react'

// Catches a crash inside one page so the rest of the site (navbar, footer) keeps working.
// While developing (npm run dev) it also prints the real error on the page, so it is easy to report.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Page error:', error, info?.componentStack)
  }

  componentDidUpdate(prev) {
    // moving to another page clears the error
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <section role="alert" className="px-[2.5vw] py-24">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Something went wrong</p>
        <h1 className="mt-4 font-display text-4xl md:text-5xl">This page could not be shown</h1>
        <p className="mt-4 max-w-xl text-neutral-600">Please reload the page. If it keeps happening, tell us what you were doing.</p>
        {import.meta.env.DEV && (
          <pre className="mt-8 max-w-3xl overflow-x-auto whitespace-pre-wrap border border-[#8a6d3b] p-4 text-sm text-[#8a6d3b]">
            {String(error?.stack || error)}
          </pre>
        )}
        <button type="button" onClick={() => window.location.reload()}
          className="mt-8 border-b border-current pb-1 text-sm uppercase tracking-[0.18em] hover:text-[#B08D57]">
          Reload page
        </button>
      </section>
    )
  }
}