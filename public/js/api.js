/* ══════ API MODULE ══════ */
const API = window.location.origin + '/api';

const LawyerAPI = {

  async chat(message, opts = {}) {
    const r = await fetch(API + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, ...opts })
    });
    return r.json();
  },

  async search(query, opts = {}) {
    const r = await fetch(API + '/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, ...opts })
    });
    return r.json();
  },

  async getDoc(id) {
    const r = await fetch(API + '/doc?id=' + encodeURIComponent(id));
    return r.json();
  },

  async stats() {
    const r = await fetch(API + '/stats');
    return r.json();
  },

  async laws() {
    const r = await fetch(API + '/laws');
    return r.json();
  },

  async librarySubcategories() {
    const r = await fetch(API + '/library/subcategories');
    return r.json();
  },

  async libraryBySubcat(subcat) {
    const r = await fetch(API + '/library/' + encodeURIComponent(subcat));
    return r.json();
  },

  async contractTypes() {
    const r = await fetch(API + '/contracts/types');
    return r.json();
  },

  async contractsByType(type) {
    const r = await fetch(API + '/contracts/' + encodeURIComponent(type));
    return r.json();
  },

  async articles() {
    const r = await fetch(API + '/articles');
    return r.json();
  },

  async generateContract(contractId, fields) {
    const r = await fetch(API + '/contracts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId, fields })
    });
    return r.json();
  }
};
