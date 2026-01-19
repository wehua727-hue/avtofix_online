let navbarElements = {
  iconElement: null,
  counterElement: null,
};

export const setNavbarFavoriteElements = ({ iconElement, counterElement }) => {
  navbarElements = {
    iconElement: iconElement ?? navbarElements.iconElement,
    counterElement: counterElement ?? navbarElements.counterElement,
  };
};

export const getNavbarFavoriteElements = () => navbarElements;
