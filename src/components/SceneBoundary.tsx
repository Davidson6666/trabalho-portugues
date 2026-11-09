/** Se a cena 3D quebrar (driver, contexto WebGL perdido...), cai para o 2D. */
import { Component, type ReactNode } from 'react';

interface Props {
  onError: () => void;
  children: ReactNode;
}

export class SceneBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('Cena 3D indisponível, usando a versão 2D.', error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
