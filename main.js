"use strict";
var UserStatus;
(function (UserStatus) {
  UserStatus["LoggedIn"] = "Logged In";
  UserStatus["LoggingIn"] = "Logging In";
  UserStatus["LoggedOut"] = "Logged Out";
  UserStatus["LogInError"] = "Log In Error";
  UserStatus["VerifyingLogIn"] = "Verifying Log In";
})(UserStatus || (UserStatus = {}));
var Default;
(function (Default) {
  Default["PIN"] = "1234";
})(Default || (Default = {}));
var WeatherType;
(function (WeatherType) {
  WeatherType["Cloudy"] = "Cloudy";
  WeatherType["Rainy"] = "Rainy";
  WeatherType["Stormy"] = "Stormy";
  WeatherType["Sunny"] = "Sunny";
})(WeatherType || (WeatherType = {}));
const defaultPosition = () => ({
  left: 0,
  x: 0
});
const N = {
  clamp: (min, value, max) => Math.min(Math.max(min, value), max),
  rand: (min, max) => Math.floor(Math.random() * (max - min + 1) + min)
};
const T = {
  format: (date) => {
    const hours = T.formatHours(date.getHours()), minutes = date.getMinutes(), seconds = date.getSeconds();
    return `${hours}:${T.formatSegment(minutes)}`;
  },
  formatHours: (hours) => {
    return hours % 12 === 0 ? 12 : hours % 12;
  },
  formatSegment: (segment) => {
    return segment < 10 ? `0${segment}` : segment;
  }
};
const LogInUtility = {
  verify: async (pin) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (pin === Default.PIN) {
          resolve(true);
        }
        else {
          reject(`Invalid pin: ${pin}`);
        }
      }, N.rand(300, 700));
    });
  }
};
const useCurrentDateEffect = () => {
  const [date, setDate] = React.useState(new Date());
  React.useEffect(() => {
    const interval = setInterval(() => {
      const update = new Date();
      if (update.getSeconds() !== date.getSeconds()) {
        setDate(update);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [date]);
  return date;
};
const ScrollableComponent = (props) => {
  const ref = React.useRef(null);
  const [state, setStateTo] = React.useState({
    grabbing: false,
    position: defaultPosition()
  });
  const handleOnMouseDown = (e) => {
    setStateTo(Object.assign(Object.assign({}, state), {
      grabbing: true, position: {
        x: e.clientX,
        left: ref.current.scrollLeft
      }
    }));
  };
  const handleOnMouseMove = (e) => {
    if (state.grabbing) {
      const left = Math.max(0, state.position.left + (state.position.x - e.clientX));
      ref.current.scrollLeft = left;
    }
  };
  const handleOnMouseUp = () => {
    if (state.grabbing) {
      setStateTo(Object.assign(Object.assign({}, state), { grabbing: false }));
    }
  };
  return (React.createElement("div", { ref: ref, className: classNames("scrollable-component", props.className), id: props.id, onMouseDown: handleOnMouseDown, onMouseMove: handleOnMouseMove, onMouseUp: handleOnMouseUp, onMouseLeave: handleOnMouseUp }, props.children));
};
const WeatherSnap = () => {
  const [temperature] = React.useState(N.rand(65, 85));
  return (React.createElement("span", { className: "weather" },
    React.createElement("i", { className: "weather-type", className: "fa-duotone fa-sun" }),
    React.createElement("span", { className: "weather-temperature-value" }, temperature),
    React.createElement("span", { className: "weather-temperature-unit" }, "\u00B0F")));
};
const Reminder = () => {
  return (React.createElement("div", { className: "reminder" },
    React.createElement("div", { className: "reminder-icon" },
      React.createElement("i", { className: "fa-regular fa-bell" })),
    React.createElement("span", { className: "reminder-text" },
      "Conectando Innovación y Sostenibilidad ",
      React.createElement("span", { className: "reminder-time" }, "10AM"))));
};
const Time = () => {
  const date = useCurrentDateEffect();
  return (React.createElement("span", { className: "time" }, T.format(date)));
};
const Info = (props) => {
  return (React.createElement("div", { id: props.id, className: "info" },
    React.createElement(Time, null),
    React.createElement(WeatherSnap, null)));
};
const PinDigit = (props) => {
  const [hidden, setHiddenTo] = React.useState(false);
  React.useEffect(() => {
    if (props.value) {
      const timeout = setTimeout(() => {
        setHiddenTo(true);
      }, 500);
      return () => {
        setHiddenTo(false);
        clearTimeout(timeout);
      };
    }
  }, [props.value]);
  return (React.createElement("div", { className: classNames("app-pin-digit", { focused: props.focused, hidden }) },
    React.createElement("span", { className: "app-pin-digit-value" }, props.value || "")));
};
const Pin = () => {
  const { userStatus, setUserStatusTo } = React.useContext(AppContext);
  const [pin, setPinTo] = React.useState("");
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (userStatus === UserStatus.LoggingIn || userStatus === UserStatus.LogInError) {
      ref.current.focus();
    }
    else {
      setPinTo(""); // Clear pin when logging out or if already logged in
    }
  }, [userStatus]);

  React.useEffect(() => {
    if (pin.length === 4) {
      const verify = async () => {
        try {
          setUserStatusTo(UserStatus.VerifyingLogIn);
          if (await LogInUtility.verify(pin)) {
            setUserStatusTo(UserStatus.LoggedIn);
            // Save login state to localStorage on successful login
            localStorage.setItem('isLoggedIn', 'true'); // <--- ADDED LINE
          }
        }
        catch (err) {
          console.error(err);
          setUserStatusTo(UserStatus.LogInError);
        }
      };
      verify();
    }
    if (userStatus === UserStatus.LogInError) {
      setUserStatusTo(UserStatus.LoggingIn);
    }
  }, [pin, userStatus]); // Added userStatus to dependencies to re-evaluate on error

  const handleOnClick = () => {
    ref.current.focus();
  };
  const handleOnCancel = () => {
    setUserStatusTo(UserStatus.LoggedOut);
    localStorage.removeItem('isLoggedIn'); // <--- ADDED LINE: Remove login state on cancel/logout
  };
  const handleOnChange = (e) => {
    if (e.target.value.length <= 4) {
      setPinTo(e.target.value.toString());
    }
  };
  const getCancelText = () => {
    return (React.createElement("span", { id: "app-pin-cancel-text", onClick: handleOnCancel }, "Cancel"));
  };
  const getErrorText = () => {
    if (userStatus === UserStatus.LogInError) {
      return (React.createElement("span", { id: "app-pin-error-text" }, "Invalid"));
    }
  };
  return (React.createElement("div", { id: "app-pin-wrapper" },
    React.createElement("input", { disabled: userStatus !== UserStatus.LoggingIn && userStatus !== UserStatus.LogInError, id: "app-pin-hidden-input", maxLength: 4, ref: ref, type: "number", value: pin, onChange: handleOnChange }),
    React.createElement("div", { id: "app-pin", onClick: handleOnClick },
      React.createElement(PinDigit, { focused: pin.length === 0, value: pin[0] }),
      React.createElement(PinDigit, { focused: pin.length === 1, value: pin[1] }),
      React.createElement(PinDigit, { focused: pin.length === 2, value: pin[2] }),
      React.createElement(PinDigit, { focused: pin.length === 3, value: pin[3] })),
    React.createElement("h3", { id: "app-pin-label" },
      "Enter PIN (1234) ",
      getErrorText(),
      " ",
      getCancelText())));
};
const MenuSection = (props) => {
  const getContent = () => {
    if (props.scrollable) {
      return (React.createElement(ScrollableComponent, { className: "menu-section-content" }, props.children));
    }
    return (React.createElement("div", { className: "menu-section-content" }, props.children));
  };
  return (React.createElement("div", { id: props.id, className: "menu-section" },
    React.createElement("div", { className: "menu-section-title" },
      React.createElement("i", { className: props.icon }),
      React.createElement("span", { className: "menu-section-title-text" }, props.title)),
    getContent()));
};
const QuickNav = () => {
  const getItems = () => {
    return [{
      id: 1,
      label: "Clima"
    }, {
      id: 2,
      label: "Estado del Tacho"
    }, {
      id: 3,
      label: "Predicción de Llenado"
    }, {
      id: 4,
      label: "Notificaciones"
    }].map((item) => {
      return (React.createElement("div", { key: item.id, className: "quick-nav-item clear-button" },
        React.createElement("span", { className: "quick-nav-item-label" }, item.label)));
    });
  };
  return (React.createElement(ScrollableComponent, { id: "quick-nav" }, getItems()));
};
const Weather = () => {
  const getDays = () => {
    return [{
      id: 1,
      name: "Mon",
      temperature: N.rand(60, 80),
      weather: WeatherType.Sunny
    }, {
      id: 2,
      name: "Tues",
      temperature: N.rand(60, 80),
      weather: WeatherType.Sunny
    }, {
      id: 3,
      name: "Wed",
      temperature: N.rand(60, 80),
      weather: WeatherType.Cloudy
    }, {
      id: 4,
      name: "Thurs",
      temperature: N.rand(60, 80),
      weather: WeatherType.Rainy
    }, {
      id: 5,
      name: "Fri",
      temperature: N.rand(60, 80),
      weather: WeatherType.Stormy
    }, {
      id: 6,
      name: "Sat",
      temperature: N.rand(60, 80),
      weather: WeatherType.Sunny
    }, {
      id: 7,
      name: "Sun",
      temperature: N.rand(60, 80),
      weather: WeatherType.Cloudy
    }].map((day) => {
      const getIcon = () => {
        switch (day.weather) {
          case WeatherType.Cloudy:
            return "fa-duotone fa-clouds";
          case WeatherType.Rainy:
            return "fa-duotone fa-cloud-drizzle";
          case WeatherType.Stormy:
            return "fa-duotone fa-cloud-bolt";
          case WeatherType.Sunny:
            return "fa-duotone fa-sun";
        }
      };
      return (React.createElement("div", { key: day.id, className: "day-card" },
        React.createElement("div", { className: "day-card-content" },
          React.createElement("span", { className: "day-weather-temperature" },
            day.temperature,
            React.createElement("span", { className: "day-weather-temperature-unit" }, "\u00B0F")),
          React.createElement("i", { className: classNames("day-weather-icon", getIcon(), day.weather.toLowerCase()) }),
          React.createElement("span", { className: "day-name" }, day.name))));
    });
  };
  return (React.createElement(MenuSection, { icon: "fa-solid fa-sun", id: "weather-section", scrollable: true, title: "How's it look out there?" }, getDays()));
};
const Tools = () => {
  const getTools = () => {
    // Definimos las URLs que tienes
    const toolLinks = [
      "public/modules/dashboard.html",
      "public/modules/graficos/index.html",
      "public/modules/ubicacion/index.html",
      "public/modules/ubicacion/escaner/index.html", // Placeholder para la herramienta 4
      "#", // Placeholder para la herramienta 5
      "#"  // Placeholder para la herramienta 6
    ];

    return [{
      icon: "fa-solid fa-cloud-sun",
      id: 1,
      image: "./images/gestion.png",
      label: "Rendimiento: En tiempo real",
      name: "Dashboard Central"
    }, {
      icon: "fa-solid fa-calculator-simple",
      id: 2,
      image: "./images/prediccion.png",
      label: "Datos: Análisis visual",
      name: "Estadísticas Clave"
    }, {
      icon: "fa-solid fa-piggy-bank",
      id: 3,
      image: "./images/eco.png",
      label: "Contenedores: Ubicación exacta:",
      name: "Mapa Interactivo"
    }, {
      icon: "fa-solid fa-plane",
      id: 4,
      image: "./images/alerta.png",
      label: "Optimización de Rutas",
      name: "Escanea tachos en el mapa "
    }, {
      icon: "fa-solid fa-gamepad-modern",
      id: 5,
      image: "./images/estado.png",
      label: "Fecha - Duracion",
      name: "Registro Estados"
    }, {
      icon: "fa-solid fa-video",
      id: 6,
      image: "./images/control.png",
      label: "Seguimiento: Inmediato",
      name: "Control Total"
    }].map((tool) => {
      const styles = {
        backgroundImage: `url(${tool.image})`
      };

      // Asignar el link correspondiente a cada herramienta
      const link = toolLinks[tool.id - 1] || "#"; // Usa el ID para acceder al link, resta 1 por ser array 0-indexed

      return (
        React.createElement("a", { key: tool.id, href: link, className: "tool-card-link" }, // Envuelve la tarjeta en un <a>
          React.createElement("div", { className: "tool-card" },
            React.createElement("div", { className: "tool-card-background background-image", style: styles }),
            React.createElement("div", { className: "tool-card-content" },
              React.createElement("div", { className: "tool-card-content-header" },
                React.createElement("span", { className: "tool-card-label" }, tool.label),
                React.createElement("span", { className: "tool-card-name" }, tool.name)),
              React.createElement("i", { className: classNames(tool.icon, "tool-card-icon") })
            )
          )
        )
      );
    });
  };
  return (React.createElement(MenuSection, { icon: "fa-solid fa-toolbox", id: "tools-section", title: "Caracteristicas" }, getTools()));
};
const Restaurants = () => {
  const getRestaurants = () => {
    return [{
      desc: "Asistente inteligente avanzado",
      id: 1,
      image: "./images/girl.jpg",
      title: "Chatbot IA",
      link: "../chat/index.html",
    }, {
      desc: "Pronóstico en tiempo real",
      id: 2,
      image: "./images/clima.png",
      title: "Clima",
      link: "#control-clima",
    }, {
      desc: "Monitoreo de residuos",
      id: 3,
      image: "./images/tachito.png",
      title: "Estados",
      link: "#control",
    }, {
      desc: "Gestión sostenible simplificada",
      id: 4,
      image: "./images/pagina1.png",
      title: "Pagina web",
      link: "../FloatBin.html",
    }].map((restaurant) => {
      const styles = {
        backgroundImage: `url(${restaurant.image})`
      };
      return (React.createElement("div", { key: restaurant.id, className: "restaurant-card background-image", style: styles, onClick: () => window.location.href = restaurant.link, },
        React.createElement("div", { className: "restaurant-card-content" },
          React.createElement("div", { className: "restaurant-card-content-items" },
            React.createElement("span", { className: "restaurant-card-title" }, restaurant.title),
            React.createElement("span", { className: "restaurant-card-desc" }, restaurant.desc)))));
    });
  };
  return (React.createElement(MenuSection, { icon: "fa-regular fa-pot-food", id: "restaurants-section", title: "Get Started" }, getRestaurants()));
};

const Movies = () => {
  const getMovies = () => {
    return [{
      desc: "Reduce costos operativos al optimizar rutas de recolección.",
      id: 1,
      icon: "fa-solid fa-galaxy",
      image: "./images/R.jpg",
      title: "Ahorro Inteligente"
    }, {
      desc: "Se adapta a cualquier entorno: urbano, playa o rural.",
      id: 2,
      icon: "fa-solid fa-hat-wizard",
      image: "./images/R2.jpg",
      title: "Versatilidad Total"
    }, {
      desc: "Recibe Notificaciones en tiempo real y predicciones precisas para actuar rápido.",
      id: 3,
      icon: "fa-solid fa-broom-ball",
      image: "./images/R3.jpg",
      title: "Alertas Instantáneas"
    }, {
      desc: "Promueve sostenibilidad al minimizar desbordes y contaminación.",
      id: 4,
      icon: "fa-solid fa-starship-freighter",
      image: "./images/img01.png",
      title: "Impacto Ambiental"
    }].map((movie) => {
      const styles = {
        backgroundImage: `url(${movie.image})`
      };
      const id = `movie-card-${movie.id}`;
      return (React.createElement("div", { key: movie.id, id: id, className: "movie-card" },
        React.createElement("div", { className: "movie-card-background background-image", style: styles }),
        React.createElement("div", { className: "movie-card-content" },
          React.createElement("div", { className: "movie-card-info" },
            React.createElement("span", { className: "movie-card-title" }, movie.title),
            React.createElement("span", { className: "movie-card-desc" }, movie.desc)),
          React.createElement("i", { className: movie.icon }))));
    });
  };
  return (React.createElement(MenuSection, { icon: "fa-solid fa-camera-movie", id: "movies-section", scrollable: true, title: "Beneficios" }, getMovies()));
};

//--------------
// Nueva Sección: Notificaciones Rápidas
const ControlEstados = () => {
  return React.createElement(
    "div",
    { id: "control", className: "control" },
    React.createElement("iframe", {
      src: "/public/index.html",
      className: "control-iframe",

    })
  );
};
//--------------
// Nueva Sección: Notificaciones Rápidas
const ControlClima = () => {
  return React.createElement(
    "div",
    { id: "control-clima", className: "control-clima" },
    React.createElement("iframe", {
      src: "/clima-main/index.html",
      className: "control-clima-iframe",

    })
  );
};

const UserStatusButton = (props) => {
  const { userStatus, setUserStatusTo } = React.useContext(AppContext);
  const handleOnClick = () => {
    setUserStatusTo(props.userStatus);
    // If the button is for logging out, also clear localStorage
    if (props.userStatus === UserStatus.LoggedOut) { // <--- MODIFIED LINE
      localStorage.removeItem('isLoggedIn'); // <--- ADDED LINE
    }
  };
  return (React.createElement("button", { id: props.id, className: "user-status-button clear-button", disabled: userStatus === props.userStatus, type: "button", onClick: handleOnClick },
    React.createElement("i", { className: props.icon })));
};
const Menu = () => {
  return (React.createElement("div", { id: "app-menu" },
    React.createElement("div", { id: "app-menu-content-wrapper" },
      React.createElement("div", { id: "app-menu-content" },
        React.createElement("div", { id: "app-menu-content-header" },
          React.createElement("div", { className: "app-menu-content-header-section" },
            React.createElement(Info, { id: "app-menu-info" }),
            React.createElement(Reminder, null)),
          React.createElement("div", { className: "app-menu-content-header-section" },
            React.createElement(UserStatusButton, { icon: "iconic", id: "sign-out-button", userStatus: UserStatus.LoggedOut }))),
        React.createElement(QuickNav, null),
        React.createElement("a", { id: "youtube-link", className: "clear-button", href: "../FloatBin.html", },
          React.createElement("i", { className: "fa-brands fa-youtube" }),
          React.createElement("span", null, "FloatBin IA")),
        React.createElement(Restaurants, null),
        React.createElement(ControlClima),
        React.createElement(Tools, null),
        React.createElement(ControlEstados),

        React.createElement(Movies, null)))));
};

const Background = () => {
  const { userStatus, setUserStatusTo } = React.useContext(AppContext);

  const images = [
    "./images/fondo1.jpg",
    "./images/fondo2.jpg",
    "./images/fondo5.jpg",
  ];

  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 10000); // Cambia cada 10 segundos

    return () => clearInterval(interval);
  }, [images.length]);

  const handleOnClick = () => {
    if (userStatus === UserStatus.LoggedOut) {
      setUserStatusTo(UserStatus.LoggingIn);
    }
  };

  return (
    React.createElement(
      "div",
      { id: "app-background", onClick: handleOnClick },
      React.createElement("div", {
        id: "app-background-image",
        className: "background-image",
        style: { backgroundImage: `url(${images[currentIndex]})` },
      })
    )
  );
};

const Loading = () => {
  return (React.createElement("div", { id: "app-loading-icon" },
    React.createElement("i", { className: "fa-solid fa-spinner-third" })));
};

const AppContext = React.createContext(null);

const App = () => {
  // Check localStorage on initial load
  const initialUserStatus = localStorage.getItem('isLoggedIn') === 'true'
    ? UserStatus.LoggedIn
    : UserStatus.LoggedOut;

  const [userStatus, setUserStatusTo] = React.useState(initialUserStatus);

  // Effect to update localStorage whenever userStatus changes
  React.useEffect(() => {
    if (userStatus === UserStatus.LoggedIn) {
      localStorage.setItem('isLoggedIn', 'true');
    } else if (userStatus === UserStatus.LoggedOut) {
      localStorage.removeItem('isLoggedIn');
    }
  }, [userStatus]);

  const getStatusClass = () => {
    return userStatus.replace(/\s+/g, "-").toLowerCase();
  };

  return (React.createElement(AppContext.Provider, { value: { userStatus, setUserStatusTo } },
    React.createElement("div", { id: "app", className: getStatusClass() },
      React.createElement(Info, { id: "app-info" }),
      React.createElement(Pin, null),
      React.createElement(Menu, null),
      React.createElement(Background, null),
      React.createElement("div", { id: "sign-in-button-wrapper" },
        React.createElement(UserStatusButton, { icon: "iconix", id: "sign-in-button", userStatus: UserStatus.LoggingIn })),
      React.createElement(Loading, null))));
};

ReactDOM.render(React.createElement(App, null), document.getElementById("root"));