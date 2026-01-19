const POP_ANIMATION_CLASSES = [
  "favorite-star-pop-add",
  "favorite-star-pop-remove",
];

export const playStarButtonAnimation = (button, action) => {
  if (!button) return;
  const className =
    action === "add" ? POP_ANIMATION_CLASSES[0] : POP_ANIMATION_CLASSES[1];
  POP_ANIMATION_CLASSES.forEach((cls) => button.classList.remove(cls));
  // force reflow to restart animation
  void button.offsetWidth; // eslint-disable-line no-unused-expressions
  button.classList.add(className);
  const handleAnimationEnd = () => {
    button.classList.remove(className);
    button.removeEventListener("animationend", handleAnimationEnd);
  };
  button.addEventListener("animationend", handleAnimationEnd);
};

const createElement = (tag, className, styles = {}) => {
  const el = document.createElement(tag);
  el.className = className;
  Object.entries(styles).forEach(([key, value]) => {
    el.style.setProperty(key, value);
  });
  return el;
};

const spawnParticles = (x, y, count = 8) => {
  for (let i = 0; i < count; i += 1) {
    const particle = createElement("div", "favorite-particle");
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const distance = 24 + Math.random() * 18;
    particle.style.setProperty(
      "--favorite-particle-x",
      `${Math.cos(angle) * distance}px`,
    );
    particle.style.setProperty(
      "--favorite-particle-y",
      `${Math.sin(angle) * distance}px`,
    );
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    document.body.appendChild(particle);
    particle.addEventListener("animationend", () => particle.remove());
  }
};

const applyCounterBounce = (counterEl, type) => {
  if (!counterEl) return;
  const className =
    type === "add"
      ? "favorite-counter-bounce-add"
      : "favorite-counter-bounce-remove";
  counterEl.classList.remove(
    "favorite-counter-bounce-add",
    "favorite-counter-bounce-remove",
  );
  void counterEl.offsetWidth; // restart animation
  counterEl.classList.add(className);
  const handleEnd = () => {
    counterEl.classList.remove(className);
    counterEl.removeEventListener("animationend", handleEnd);
  };
  counterEl.addEventListener("animationend", handleEnd);
};

export const playNavbarFavoriteAddAnimation = ({
  startRect,
  targetRect,
  iconElement,
  counterElement,
}) => {
  if (!startRect || !targetRect || !iconElement) {
    applyCounterBounce(counterElement, "add");
    return;
  }

  const startX = startRect.left + startRect.width / 2;
  const startY = startRect.top + startRect.height / 2;
  const targetX = targetRect.left + targetRect.width / 2;
  const targetY = targetRect.top + targetRect.height / 2;

  const deltaX = targetX - startX;
  const deltaY = targetY - startY;

  const flyStar = createElement("div", "favorite-fly-star", {
    left: `${startX}px`,
    top: `${startY}px`,
  });
  flyStar.style.setProperty("--favorite-fly-x", `${deltaX}px`);
  flyStar.style.setProperty("--favorite-fly-y", `${deltaY}px`);
  document.body.appendChild(flyStar);

  const cleanupFly = () => {
    flyStar.removeEventListener("animationend", cleanupFly);
    flyStar.remove();
    const iconRect = iconElement.getBoundingClientRect();
    spawnParticles(
      iconRect.left + iconRect.width / 2,
      iconRect.top + iconRect.height / 2,
      10,
    );
    applyCounterBounce(counterElement, "add");
  };

  flyStar.addEventListener("animationend", cleanupFly);
};

export const playNavbarFavoriteRemoveAnimation = ({ counterElement }) => {
  applyCounterBounce(counterElement, "remove");
};
