// Render sırasında oluşan hataları boş ekran yerine okunabilir bir kutuda gösterir.
import React from 'react';
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="login-screen">
          <section className="login-panel">
            <h1>TravelLog açılamadı</h1>
            <p>{this.state.error.message}</p>
            <small>Sayfayı yenileyin; hata devam ederse tarayıcı konsolundaki mesajı paylaşın.</small>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
