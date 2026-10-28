import { Component } from 'react'
import Button from './ui/Button.jsx'

export default class PageBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className="state-page" role="alert">
        <h1>화면을 불러오지 못했어요.</h1>
        <p>연결 상태를 확인하고 페이지를 새로고침해 주세요.</p>
        <Button onClick={() => window.location.reload()}>다시 불러오기</Button>
      </div>
    )
  }
}
