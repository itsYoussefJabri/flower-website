import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";

const navItems = [
  { to: "/", label: "Home", icon: "🏠", end: true },
  { to: "/garden", label: "Petal Garden", icon: "🌺" },
  { to: "/trail", label: "Bloom Trail", icon: "🌸" },
  { to: "/game", label: "Flower Shooter", icon: "🎯" },
];

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <nav className={`modern-nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-pill">
          <NavLink to="/" className="nav-brand">
            <span className="brand-flower">🌸</span>
            <span className="brand-label">Chaimae's Garden</span>
          </NavLink>

          <div className="nav-desktop-links">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end || false}
                className={({ isActive }) =>
                  `nav-desk-item${isActive ? " active" : ""}`
                }
              >
                <span className="desk-icon">{item.icon}</span>
                <span className="desk-label">{item.label}</span>
              </NavLink>
            ))}
          </div>

          <button
            className={`nav-burger${mobileOpen ? " open" : ""}`}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <aside className={`nav-drawer${mobileOpen ? " open" : ""}`}>
        <div className="drawer-head">
          <span className="drawer-brand">🌸 Chaimae's Garden</span>
          <button
            className="drawer-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="drawer-links">
          {navItems.map((item, i) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end || false}
              className={({ isActive }) =>
                `drawer-item${isActive ? " active" : ""}`
              }
              style={{ animationDelay: `${0.08 + i * 0.06}s` }}
              onClick={() => setMobileOpen(false)}
            >
              <span className="drawer-icon">{item.icon}</span>
              <span className="drawer-label">{item.label}</span>
              <span className="drawer-arrow">→</span>
            </NavLink>
          ))}
        </div>
        <div className="drawer-footer">
          <div className="drawer-decor">❀ ✿ ❁ ✾</div>
        </div>
      </aside>
      <div
        className={`nav-overlay${mobileOpen ? " visible" : ""}`}
        onClick={() => setMobileOpen(false)}
      />
    </>
  );
}

export default Navbar;
