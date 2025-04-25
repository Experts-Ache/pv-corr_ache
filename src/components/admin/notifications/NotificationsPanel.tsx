import React, { useState, useEffect } from "react";
import { Theme } from "../../../types/theme";
import { BellRing, AlertTriangle, AlertOctagon, Plus, Edit2, Save, X, Clock } from "lucide-react";
import { NotificationDuration, Notification, DURATION_OPTIONS } from "../../../types/security";
import { createNotification, updateNotification, deleteNotification, getNotificationsByType } from "../../../services/notifications";
import { TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow, Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface NotificationsPanelProps {
  currentTheme: Theme;
  onBack: () => void;
}

type NotificationType = "info" | "warning" | "error" | null;

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ currentTheme, onBack }) => {
  const [selectedType, setSelectedType] = useState<NotificationType>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});
  const [isNewRow, setIsNewRow] = useState(false);

  // Load notifications when type is selected
  useEffect(() => {
    const loadNotifications = async () => {
      if (!selectedType) return;

      try {
        setLoading(true);
        const data = await getNotificationsByType(selectedType);
        setNotifications(data);
      } catch (err) {
        console.error("Error loading notifications:", err);
        setError("Failed to load notifications");
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [selectedType]);

  const getTypeColor = (type: NotificationType) => {
    return "";
    // skip this for now
    switch (type) {
      case "info":
        return currentTheme.colors.accent.primary;
      case "warning":
        return "#f59e0b";
      case "error":
        return "#ef4444";
      default:
        return currentTheme.colors.text.secondary;
    }
  };

  const handleSave = async () => {
    if (!selectedType || !editingValues.name || !editingValues.description) {
      setError("Name and description are required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const notificationData = {
        type: selectedType,
        name: editingValues.name,
        description: editingValues.description,
        duration: editingValues.duration || "timed",
        timeout: editingValues.duration === "timed" ? editingValues.timeout || 5 : undefined,
      };

      if (isNewRow) {
        await createNotification(notificationData);
      } else if (editingId) {
        await updateNotification(editingId, notificationData);
      }

      // Refresh notifications list
      const updatedNotifications = await getNotificationsByType(selectedType);
      setNotifications(updatedNotifications);

      // Reset editing state
      setEditingId(null);
      setEditingValues({});
      setIsNewRow(false);
    } catch (err) {
      console.error("Error saving notification:", err);
      setError("Failed to save notification");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedType) return;

    try {
      setLoading(true);
      setError(null);

      await deleteNotification(id);

      // Refresh notifications list
      const updatedNotifications = await getNotificationsByType(selectedType);
      setNotifications(updatedNotifications);
    } catch (err) {
      console.error("Error deleting notification:", err);
      setError("Failed to delete notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 text-card-foreground">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-2xl font-bold">Notifications</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Information Notifications */}
        <div
          onClick={() => setSelectedType(selectedType === "info" ? null : "info")}
          className="p-6 rounded-lg border border-accent cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              //style={{ backgroundColor: `${currentTheme.colors.accent.primary}20` }}
            >
              <BellRing size={20} />
            </div>
            <div>
              <h3 className="font-medium">Information</h3>
              <p className="text-sm text-muted-foreground">{notifications.filter((n) => n.type === "info").length} notifications</p>
            </div>
          </div>
        </div>

        {/* Warning Notifications */}
        <div
          onClick={() => setSelectedType(selectedType === "warning" ? null : "warning")}
          className="p-6 rounded-lg border border-accent cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#f59e0b20" }}>
              <AlertTriangle style={{ color: "#f59e0b" }} size={20} />
            </div>
            <div>
              <h3 className="font-medium">Warnings</h3>
              <p className="text-sm text-muted-foreground">{notifications.filter((n) => n.type === "warning").length} notifications</p>
            </div>
          </div>
        </div>

        {/* Error Notifications */}
        <div
          onClick={() => setSelectedType(selectedType === "error" ? null : "error")}
          className="p-6 rounded-lg border border-accent cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#ef444420" }}>
              <AlertOctagon style={{ color: "#ef4444" }} size={20} />
            </div>
            <div>
              <h3 className="font-medium">Errors</h3>
              <p className="text-sm text-muted-foreground">{notifications.filter((n) => n.type === "error").length} notifications</p>
            </div>
          </div>
        </div>
      </div>

      {selectedType && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              {selectedType === "info" ? "Information" : selectedType === "warning" ? "Warnings" : "Errors"}
            </h3>
            <Button
              onClick={() => {
                setIsNewRow(true);
                setEditingId(null);
                setEditingValues({
                  name: "",
                  description: "",
                  duration: "timed",
                  timeout: 5,
                });
              }}
              style={{
                backgroundColor: getTypeColor(selectedType),
                color: "white",
              }}
            >
              <Plus size={14} />
              Add {selectedType === "info" ? "Information" : selectedType === "warning" ? "Warning" : "Error"}
            </Button>
          </div>

          <section className="border border-input rounded-md bg-card">
            <div className="w-full relative overflow-auto">
              <Table>
                <TableCaption>{selectedType === "info" ? "Information" : selectedType === "warning" ? "Warnings" : "Errors"}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isNewRow && (
                    <TableRow>
                      <TableCell className="h-10 px-2">
                        <Input
                          type="text"
                          value={editingValues.name || ""}
                          onChange={(e) => setEditingValues({ ...editingValues, name: e.target.value })}
                          placeholder="Enter name"
                        />
                      </TableCell>
                      <TableCell className="h-10 px-2">
                        <Textarea
                          value={editingValues.description || ""}
                          onChange={(e) => setEditingValues({ ...editingValues, description: e.target.value })}
                          placeholder="Enter description"
                          style={{ resize: "vertical" }}
                          rows={1}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSave();
                            }
                          }}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = "auto";
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                        />
                      </TableCell>
                      <TableCell className="h-10 px-2">
                        <div className="flex gap-2">
                          <select
                            value={editingValues.duration || "timed"}
                            onChange={(e) =>
                              setEditingValues({
                                ...editingValues,
                                duration: e.target.value,
                                timeout: e.target.value === "timed" ? 5 : undefined,
                              })
                            }
                            className="w-full h-8 px-2 rounded text-sm text-primary border-theme border-solid bg-surface"
                          >
                            {DURATION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {editingValues.duration === "timed" && (
                            <Input
                              type="number"
                              value={editingValues.timeout || 5}
                              onChange={(e) => setEditingValues({ ...editingValues, timeout: parseInt(e.target.value) })}
                              min={1}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="h-10 px-2">
                        <div className="flex items-center justify-center gap-2">
                          <Button onClick={handleSave} disabled={loading} variant="ghost">
                            <Save size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setIsNewRow(false);
                              setEditingValues({});
                            }}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {notifications
                    .filter((n) => n.type === selectedType)
                    .map((notification) => (
                      <TableRow className="text-card-foreground" key={notification.id}>
                        <TableCell className="h-10 px-2">
                          {editingId === notification.id ? (
                            <Input
                              type="text"
                              value={editingValues.name || notification.name}
                              onChange={(e) => setEditingValues({ ...editingValues, name: e.target.value })}
                              className="w-full h-8 px-2"
                            />
                          ) : (
                            notification.name
                          )}
                        </TableCell>
                        <TableCell className="h-10 px-2">
                          {editingId === notification.id ? (
                            <Textarea
                              value={editingValues.description || notification.description}
                              onChange={(e) => setEditingValues({ ...editingValues, description: e.target.value })}
                              style={{ resize: "vertical" }}
                              rows={3}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSave();
                                }
                              }}
                            />
                          ) : (
                            <div className="whitespace-pre-wrap break-words">{notification.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="h-10 px-2">
                          {editingId === notification.id ? (
                            <div className="flex gap-2">
                              <select
                                value={editingValues.duration || notification.duration}
                                onChange={(e) =>
                                  setEditingValues({
                                    ...editingValues,
                                    duration: e.target.value,
                                    timeout: e.target.value === "timed" ? notification.timeout || 5 : undefined,
                                  })
                                }
                                className="w-full h-8 px-2 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                              >
                                {DURATION_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              {(editingValues.duration || notification.duration) === "timed" && (
                                <Input
                                  type="number"
                                  value={editingValues.timeout || notification.timeout || 5}
                                  onChange={(e) => setEditingValues({ ...editingValues, timeout: parseInt(e.target.value) })}
                                  className="w-24 h-8 px-2"
                                  min={1}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Clock size={12} className="text-secondary" />
                              <span>
                                {notification.duration === "timed"
                                  ? `Auto-dismiss after ${notification.timeout}s`
                                  : notification.duration === "acknowledge"
                                    ? "Requires acknowledgment"
                                    : "Persistent until dismissed"}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="h-10 px-2">
                          <div className="flex items-center justify-center gap-2">
                            {editingId === notification.id ? (
                              <>
                                <Button onClick={handleSave} variant="ghost" disabled={loading}>
                                  <Save size={14} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditingValues({});
                                  }}
                                >
                                  <X size={14} />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingId(notification.id);
                                    setEditingValues({
                                      name: notification.name,
                                      description: notification.description,
                                      duration: notification.duration,
                                      timeout: notification.timeout,
                                    });
                                  }}
                                >
                                  <Edit2 size={14} />
                                </Button>
                                <Button onClick={() => handleDelete(notification.id)} variant="ghost">
                                  <X size={14} />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;
