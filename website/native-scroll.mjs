// Observe visibility without taking ownership of scrolling or navigation.
export function observeSections(host, Observer = globalThis.IntersectionObserver) {
 const sections = [...host.querySelectorAll(':scope > .screen')];
 if (!Observer) {
  sections.forEach(section => { section.dataset.active = 'true'; });
  return () => sections.forEach(section => { delete section.dataset.active; });
 }
 const observer = new Observer(entries => {
  for (const entry of entries) entry.target.dataset.active = String(entry.isIntersecting);
 }, {threshold: 0});
 sections.forEach(section => observer.observe(section));
 return () => observer.disconnect();
}
