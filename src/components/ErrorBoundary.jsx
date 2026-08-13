import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="card">
        <div className="card__head">
          <h2>Something went wrong</h2>
        </div>
        <p className="error">
          {this.state.error?.message ?? 'An unexpected error occurred. Please refresh the page.'}
        </p>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            this.setState({ error: null })
          }}
        >
          Try again
        </button>
      </div>
    )
  }
}

export default ErrorBoundary