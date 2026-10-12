"use client";
import { settingOptions } from "@/components/setting/settingsEmailForm";
import React, { useEffect, useState, useRef } from "react";
import { FiBell, FiCheck } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { API_BASE_URL, SOCKET_URL } from '../../../config/api';

const NotificationsModal = () => {
  const [notifications, setNotifications] = useState([]);
  const token = localStorage.getItem("token");
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const boxRef = useRef(null);
  const [open, setOpen] = useState(false);
  // the menu is opened / closed by React (Bootstrap's data-api toggle was unreliable here)
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // open the item the notification is about (and mark it read)
  const openNotification = async (n) => {
    setOpen(false);
    setNotifications((prev) => prev.filter((x) => x.notification_id !== n.notification_id));
    fetch(`${API_BASE_URL}/api/notification/${n.notification_id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    if (n.action_url && n.action_url.startsWith("/")) navigate(n.action_url);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // 🔔 SYSTEM NOTIFICATION FUNCTION
  const showSystemNotification = (title, message) => {
  if (!("Notification" in window)) return;

  const appName = "Kary (Techleela CRM)"; // 🔥 your website name

  if (Notification.permission === "granted") {
    new Notification(appName, {
      body: `${title} - ${message}`, // message inside body
      icon: "/images/logo/techlal.png", // 🔥 your logo (IMPORTANT)
      badge: "/images/logo/techlal.png", // optional (for Chrome Android)
      tag: `Kary (Techleela CRM)-Notification-${Date.now()}`,
      // tag: "Kary (Techleela CRM)", // prevents duplicates
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification(appName, {
          body: `${title} - ${message}`,
          icon: "/images/logo/techlal.png",
          badge: "/logo192.png",
        });
      }
    });
  }
};

  // 🔹 FETCH NOTIFICATIONS
  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notification`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        const unreadNotifications = json.data.filter(
          (notification) => notification.is_read === false
        );
        setNotifications(unreadNotifications);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  // 🔹 SOCKET + PERMISSION SETUP
  useEffect(() => {
    fetchNotifications();
    // Ask permission once
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    // Setup socket
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current.on("connect", () => {
      console.log("Socket connected!", socketRef.current.id);
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });

    socketRef.current.on("disconnect", (reason) => {
      console.warn("Socket disconnected:", reason);
    });

    // 🔔 Listen for new notifications
    socketRef.current.on("notification", (notification) => {
      console.log("Received notification:", notification, document.visibilityState);

      // Show system notification only if tab not active
      if (document.visibilityState !== "visible") {
        showSystemNotification(notification.title, notification.message);
      }

      // Update UI
      setNotifications((prev) => [notification, ...prev]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // 🔹 MARK ALL AS READ
  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/notification/read-all`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const json = await res.json();

      if (res.ok && json.success) {
        setNotifications([]);
      } else {
        console.error(json.message);
      }
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    }
  };

  // 🔹 REMOVE NOTIFICATION (UI ONLY)
  const removeNotification = (id) => {
    setNotifications((prev) =>
      prev.filter((n) => n.notification_id !== id)
    );
  };

  return (
    <div className="dropdown nxl-h-item" ref={boxRef}>
      <div className="nxl-head-link me-3" role="button" aria-label="Notifications" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <FiBell size={20} />
        {unreadCount > 0 && (
          <span className="badge bg-danger nxl-h-badge">{unreadCount}</span>
        )}
      </div>

      <div className={`dropdown-menu dropdown-menu-end nxl-h-dropdown nxl-notifications-menu ${open ? "show" : ""}`} style={open ? { position: "absolute", right: 0, top: "100%" } : undefined}>
        <div className="d-flex justify-content-between align-items-center notifications-head">
          <h6 className="fw-bold text-dark mb-0">Notifications</h6>
          <button
            className="btn btn-link fs-11 text-success"
            onClick={handleMarkAllAsRead}
          >
            <FiCheck size={14} /> Mark all as read
          </button>
        </div>

        {notifications.length === 0 && (
          <p className="text-center text-muted py-4">
            No notifications
          </p>
        )}

        {notifications.slice(0, 3).map((notification) => (
          <div
            key={notification.notification_id}
            className={`notification-item d-flex align-items-start px-3 ${
              !notification.is_read ? "unread" : "read"
            }`}
            role="button"
            onClick={() => openNotification(notification)}
          >
            {/* Dot */}
            <span
              className={`notification-dot ${
                !notification.is_read ? "bg-primary" : "bg-secondary"
              }`}
            />

            {/* Content */}
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-center">
                <p className="mb-0 fw-semibold text-dark">
                  {notification.title}
                </p>
                <small className="text-muted">
                  {new Date(notification.created_at).toLocaleTimeString()}
                </small>
              </div>

              <p className="mb-1 text-muted fs-13">
                {notification.message}
              </p>
              <hr />
            </div>
          </div>
        ))}

        <div className="text-center notifications-footer">
          <Link to="/notifications" className="fs-13 fw-semibold text-dark" onClick={() => setOpen(false)}>
            View all notifications
          </Link>
          <span className="mx-2 text-muted">·</span>
          <Link to="/account/notifications" className="fs-13 text-muted" onClick={() => setOpen(false)}>
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;