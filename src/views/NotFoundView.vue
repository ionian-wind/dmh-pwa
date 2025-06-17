<script setup lang="ts">
// No setup needed
</script>

<template>
  <div class="not-found">
    <h1>404 - Page Not Found</h1>
    <p>The page you are looking for does not exist.</p>
    <router-link to="/" class="button">Go Home</router-link>
  </div>
</template>

<style scoped>
.not-found {
  text-align: center;
  padding: 2rem;
}

.button {
  display: inline-block;
  padding: 0.5rem 1rem;
  background-color: var(--color-primary);
  color: white;
  text-decoration: none;
  border-radius: 4px;
  margin-top: 1rem;
}

.button:hover {
  background-color: var(--color-primary-dark);
}
</style> 