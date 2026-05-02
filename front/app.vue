<template>
  <AppHeader />
  <AppNotifications />
  <NuxtPage />
  <AppFooter />
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  background: #f8fafc;
  color: #1e2a38;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  margin: 0;
}

button,
input,
select,
textarea {
  font: inherit;
}

.page-shell {
  margin: 0 auto;
  max-width: 1120px;
  padding: 2rem 1.25rem 0;
}

.page-title-row {
  align-items: flex-start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.page-title-row h1 {
  font-size: 2rem;
  line-height: 1.2;
  margin: 0;
}

.lead {
  color: #53657a;
  line-height: 1.7;
  margin: 0.5rem 0 0;
  max-width: 760px;
}

.panel {
  background: #ffffff;
  border: 1px solid #dbe3ed;
  border-radius: 8px;
  padding: 1.25rem;
}

.grid {
  display: grid;
  gap: 1rem;
}

.grid.is-two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: grid;
  gap: 0.35rem;
}

.field label {
  color: #33475f;
  font-weight: 700;
}

.input,
.select,
.textarea {
  border: 1px solid #b7c4d2;
  border-radius: 6px;
  color: #1e2a38;
  min-height: 42px;
  padding: 0.55rem 0.7rem;
  width: 100%;
}

.textarea {
  min-height: 88px;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.button {
  align-items: center;
  background: #005eb8;
  border: 1px solid #005eb8;
  border-radius: 6px;
  color: #ffffff;
  cursor: pointer;
  display: inline-flex;
  font-weight: 700;
  min-height: 42px;
  padding: 0.55rem 0.9rem;
  text-decoration: none;
}

.button.is-secondary {
  background: #ffffff;
  color: #005eb8;
}

.button.is-danger {
  background: #b3261e;
  border-color: #b3261e;
}

.muted {
  color: #66788d;
}

.result-list {
  display: grid;
  gap: 0.8rem;
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
}

.result-item {
  border: 1px solid #dbe3ed;
  border-radius: 8px;
  padding: 0.9rem;
}

@media (max-width: 760px) {
  .grid.is-two {
    grid-template-columns: 1fr;
  }

  .page-title-row {
    display: grid;
  }
}
</style>
