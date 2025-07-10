// src/app/maintenance/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Camera,
  Wrench,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MaintenanceRequest {
  id: number;
  user_name: string;
  user_email: string;
  equipment_id?: number;
  equipment_name?: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  reported_date: string;
  started_date?: string;
  completed_date?: string;
  admin_notes?: string;
  handled_by_name?: string;
  handled_by_email?: string;
  is_repair_completed: boolean;
  repair_cost?: number;
  repair_notes?: string;
  image_url?: string;
  image_filename?: string;
  created_at: string;
  updated_at: string;
}

interface Equipment {
  id: number;
  name: string;
  category: string;
  status: string;
}

const priorityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const statusColors = {
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const priorityLabels = {
  low: "ต่ำ",
  medium: "ปานกลาง",
  high: "สูง",
  urgent: "ด่วนมาก",
};

const statusLabels = {
  pending: "รอดำเนินการ",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

export default function MaintenancePage() {
  const { user, isLoaded } = useUser();
  const [notification, setNotification] = useState(null);
  const [image, setImage] = useState<File | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "user" | null>(null);
  const [maintenanceRequests, setMaintenanceRequests] = useState<
    MaintenanceRequest[]
  >([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<MaintenanceRequest | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [requestToCancel, setRequestToCancel] =
    useState<MaintenanceRequest | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  // Filtered requests (move this above pagination logic)
  const filteredRequests = (() => {
    let requests =
      userRole === "admin"
        ? maintenanceRequests
        : maintenanceRequests.filter(
            (req) => req.user_email === user?.emailAddresses[0].emailAddress
          );

    // Apply status filter
    if (statusFilter !== "all") {
      requests = requests.filter((req) => req.status === statusFilter);
    }

    return requests;
  })();

  // Pagination logic
  const indexOfLastItem =
    itemsPerPage === 0 ? filteredRequests.length : currentPage * itemsPerPage;
  const indexOfFirstItem =
    itemsPerPage === 0 ? 0 : indexOfLastItem - itemsPerPage;
  const currentItems =
    itemsPerPage === 0
      ? filteredRequests
      : filteredRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages =
    itemsPerPage === 0 ? 1 : Math.ceil(filteredRequests.length / itemsPerPage);

  // Form states
  const [formData, setFormData] = useState<{
    equipment_id: string;
    equipment_name: string;
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
    image: File | null;
  }>({
    equipment_id: "",
    equipment_name: "",
    title: "",
    description: "",
    priority: "medium",
    image: null,
  });

  // Admin form states
  const [adminFormData, setAdminFormData] = useState({
    status: "",
    admin_notes: "",
    repair_cost: "",
    repair_notes: "",
    started_date: "",
    completed_date: "",
  });

  // Reset form data function
  const resetFormData = () => {
    setFormData({
      equipment_id: "",
      equipment_name: "",
      title: "",
      description: "",
      priority: "medium",
      image: null,
    });
    // Reset file input
    const fileInput = document.getElementById("image") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  // Handle cancel button
  const handleCancel = () => {
    resetFormData();
    setIsCreateDialogOpen(false);
  };

  const handleCancelRequest = async (requestId: number) => {
    try {
      const response = await fetch(`/api/maintenance/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "cancelled",
        }),
      });

      if (response.ok) {
        const updatedRequest = await response.json();
        setMaintenanceRequests((prev) =>
          prev.map((req) => (req.id === requestId ? updatedRequest : req))
        );
        setCancelDialogOpen(false);
        setRequestToCancel(null);
        alert("ยกเลิกการแจ้งซ่อมเรียบร้อยแล้ว");
      } else {
        const error = await response.json();
        alert(`เกิดข้อผิดพลาด: ${error.error}`);
      }
    } catch (error) {
      console.error("Error cancelling maintenance request:", error);
      alert("เกิดข้อผิดพลาดในการยกเลิกการแจ้งซ่อม");
    }
  };

  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        try {
          const response = await fetch(`/api/users/role?clerk_id=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            setUserRole(data.role);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      }
    };

    if (isLoaded && user) {
      checkUserRole();
    }
  }, [user, isLoaded]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredRequests.length]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [requestsRes, equipmentRes] = await Promise.all([
          fetch("/api/maintenance"),
          fetch("/api/equipment"),
        ]);

        if (requestsRes.ok) {
          const requestsData = await requestsRes.json();
          setMaintenanceRequests(requestsData);
        }

        if (equipmentRes.ok) {
          const equipmentData = await equipmentRes.json();
          setEquipment(equipmentData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    console.log("Form data image:", formData.image); // เพิ่ม log

    setSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("equipment_id", formData.equipment_id);
      formDataToSend.append("equipment_name", formData.equipment_name);
      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("priority", formData.priority);
      formDataToSend.append("clerk_id", user.id);

      if (formData.image) {
        console.log("Appending image to FormData:", formData.image.name);
        formDataToSend.append("image", formData.image);
      }

      // ตรวจสอบ FormData
      console.log("FormData entries:");
      for (let [key, value] of formDataToSend.entries()) {
        console.log(key, value);
      }

      const response = await fetch("/api/maintenance", {
        method: "POST",
        body: formDataToSend,
      });

      if (response.ok) {
        const newRequest = await response.json();
        setMaintenanceRequests((prev) => [newRequest, ...prev]);
        resetFormData();
        setIsCreateDialogOpen(false);

        // Show success message (optional)
        alert("ส่งคำขอซ่อมเรียบร้อยแล้ว");
      } else {
        const error = await response.json();
        alert(`เกิดข้อผิดพลาด: ${error.error}`);
      }
    } catch (error) {
      console.error("Error creating maintenance request:", error);
      alert("เกิดข้อผิดพลาดในการส่งคำขอ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (requestId: number) => {
    if (!user || userRole !== "admin") return;

    try {
      const response = await fetch(`/api/maintenance/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...adminFormData,
          handled_by_name:
            user.fullName ||
            user.firstName ||
            user.emailAddresses[0].emailAddress,
          handled_by_email: user.emailAddresses[0].emailAddress,
          is_repair_completed: adminFormData.status === "completed",
        }),
      });

      if (response.ok) {
        const updatedRequest = await response.json();
        setMaintenanceRequests((prev) =>
          prev.map((req) => (req.id === requestId ? updatedRequest : req))
        );
        setSelectedRequest(null);
        setAdminFormData({
          status: "",
          admin_notes: "",
          repair_cost: "",
          repair_notes: "",
          started_date: "",
          completed_date: "",
        });
        // Optionally show a success message
        alert("อัพเดทสถานะเรียบร้อยแล้ว");
      } else {
        const error = await response.json();
        alert(`เกิดข้อผิดพลาด: ${error.error}`);
      }
    } catch (error) {
      console.error("Error updating maintenance request:", error);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Wrench className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">ระบบแจ้งซ่อม</h1>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              แจ้งซ่อมใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>แจ้งซ่อมอุปกรณ์</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Label htmlFor="equipment_id">อุปกรณ์</Label>
                  <Select
                    value={formData.equipment_id}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        equipment_id: value,
                      }))
                    }
                  >
                    <SelectTrigger
                      id="equipment_select"
                      className="w-full pr-2"
                    >
                      <SelectValue placeholder="เลือกอุปกรณ์" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipment.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name}{" "}
                          {item.category ? `(${item.category})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {formData.equipment_id && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          equipment_id: "",
                        }))
                      }
                      className="absolute right-8 top-1/2 -translate-y-1/4 text-gray-400 hover:text-red-500 z-20"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="equipment_name">
                    หรือระบุชื่ออุปกรณ์อื่นๆ
                  </Label>
                  <Input
                    id="equipment_name"
                    value={formData.equipment_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        equipment_name: e.target.value,
                      }))
                    }
                    placeholder="ชื่ออุปกรณ์ที่ต้องการซ่อม"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="title">หัวข้อการแจ้งซ่อม</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="เช่น เครื่องขยายเสียงเสียงแตก"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">รายละเอียด</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="อธิบายปัญหาที่พบ และอาการที่เกิดขึ้น"
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="priority">ระดับความสำคัญ</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(
                    value: "low" | "medium" | "high" | "urgent"
                  ) => setFormData((prev) => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">ต่ำ</SelectItem>
                    <SelectItem value="medium">ปานกลาง</SelectItem>
                    <SelectItem value="high">สูง</SelectItem>
                    <SelectItem value="urgent">ด่วนมาก</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="image"
                  className="block text-sm font-medium text-gray-700"
                >
                  แนบรูปภาพ
                </label>

                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setImage(file || null);
                  }}
                />

                {image && (
                  <div className="relative mt-2 inline-block">
                    <img
                      src={URL.createObjectURL(image)}
                      alt="Preview"
                      className="max-w-xs rounded-lg border border-gray-300 shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="absolute top-1 right-1 bg-white rounded-full p-1 border border-gray-300 hover:bg-red-500 hover:text-white transition"
                      aria-label="Remove image"
                    >
                      ✖
                    </button>
                  </div>
                )}
              </div>

              {/* แก้ไขปุ่มยกเลิก */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "กำลังส่ง..." : "ส่งคำขอ"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "all" ? "ring-2 ring-blue-500 bg-blue-50" : ""
          }`}
          onClick={() => setStatusFilter("all")}
        >
          <CardContent className="flex flex-col items-center p-4">
            <div className="rounded-full bg-gray-100 p-2 mb-2">
              <FileText className="h-5 w-5 text-gray-600" />
            </div>
            <p className="text-xs text-gray-600 mb-1">ทั้งหมด</p>
            <p className="text-xl font-bold">
              {
                (userRole === "admin"
                  ? maintenanceRequests
                  : maintenanceRequests.filter(
                      (req) =>
                        req.user_email === user?.emailAddresses[0].emailAddress
                    )
                ).length
              }
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "pending"
              ? "ring-2 ring-orange-500 bg-orange-50"
              : ""
          }`}
          onClick={() => setStatusFilter("pending")}
        >
          <CardContent className="flex flex-col items-center p-4">
            <div className="rounded-full bg-gray-100 p-2 mb-2">
              <AlertCircle className="h-5 w-5 text-gray-600" />
            </div>
            <p className="text-xs text-gray-600 mb-1">รอดำเนินการ</p>
            <p className="text-xl font-bold">
              {
                (userRole === "admin"
                  ? maintenanceRequests
                  : maintenanceRequests.filter(
                      (req) =>
                        req.user_email === user?.emailAddresses[0].emailAddress
                    )
                ).filter((req) => req.status === "pending").length
              }
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "in_progress"
              ? "ring-2 ring-blue-500 bg-blue-50"
              : ""
          }`}
          onClick={() => setStatusFilter("in_progress")}
        >
          <CardContent className="flex flex-col items-center p-4">
            <div className="rounded-full bg-blue-100 p-2 mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-xs text-gray-600 mb-1">กำลังดำเนินการ</p>
            <p className="text-xl font-bold">
              {
                (userRole === "admin"
                  ? maintenanceRequests
                  : maintenanceRequests.filter(
                      (req) =>
                        req.user_email === user?.emailAddresses[0].emailAddress
                    )
                ).filter((req) => req.status === "in_progress").length
              }
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "completed"
              ? "ring-2 ring-green-500 bg-green-50"
              : ""
          }`}
          onClick={() => setStatusFilter("completed")}
        >
          <CardContent className="flex flex-col items-center p-4">
            <div className="rounded-full bg-green-100 p-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-xs text-gray-600 mb-1">เสร็จสิ้น</p>
            <p className="text-xl font-bold">
              {
                (userRole === "admin"
                  ? maintenanceRequests
                  : maintenanceRequests.filter(
                      (req) =>
                        req.user_email === user?.emailAddresses[0].emailAddress
                    )
                ).filter((req) => req.status === "completed").length
              }
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "cancelled" ? "ring-2 ring-red-500 bg-red-50" : ""
          }`}
          onClick={() => setStatusFilter("cancelled")}
        >
          <CardContent className="flex flex-col items-center p-4">
            <div className="rounded-full bg-red-100 p-2 mb-2">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-xs text-gray-600 mb-1">ยกเลิก</p>
            <p className="text-xl font-bold">
              {
                (userRole === "admin"
                  ? maintenanceRequests
                  : maintenanceRequests.filter(
                      (req) =>
                        req.user_email === user?.emailAddresses[0].emailAddress
                    )
                ).filter((req) => req.status === "cancelled").length
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>รายการแจ้งซ่อม</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="itemsPerPage" className="text-sm">
              แสดง:
            </Label>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(parseInt(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">ทั้งหมด</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="20">20</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">รายการ</span>
          </div>
        </div>
      </CardHeader>

      <Card>
        <CardContent>
          <div className="space-y-4">
            {currentItems.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{request.title}</h3>
                      <Badge className={cn(priorityColors[request.priority])}>
                        {priorityLabels[request.priority]}
                      </Badge>
                      <Badge className={cn(statusColors[request.status])}>
                        {statusLabels[request.status]}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{request.user_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(request.reported_date).toLocaleDateString(
                            "th-TH"
                          )}
                        </span>
                      </div>
                      {request.equipment_name && (
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          <span>{request.equipment_name}</span>
                        </div>
                      )}
                      {request.handled_by_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>ผู้ดำเนินการ: {request.handled_by_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {request.image_url && (
                      <Camera className="h-5 w-5 text-gray-400" />
                    )}

                    {/* ปุ่มยกเลิก - แสดงเฉพาะรายการของตัวเองที่ยังไม่ได้ดำเนินการ */}
                    {request.user_email ===
                      user?.emailAddresses[0].emailAddress &&
                      request.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRequestToCancel(request);
                            setCancelDialogOpen(true);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          ยกเลิก
                        </Button>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && itemsPerPage > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-gray-600">
                แสดง {indexOfFirstItem + 1}-
                {Math.min(indexOfLastItem, filteredRequests.length)} จาก{" "}
                {filteredRequests.length} รายการ
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                >
                  ก่อนหน้า
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      {requestToCancel && (
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ยืนยันการยกเลิก</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>คุณต้องการยกเลิกการแจ้งซ่อมนี้หรือไม่?</p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold">{requestToCancel.title}</p>
                <p className="text-sm text-gray-600">
                  วันที่แจ้ง:{" "}
                  {new Date(requestToCancel.reported_date).toLocaleDateString(
                    "th-TH"
                  )}
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCancelDialogOpen(false);
                    setRequestToCancel(null);
                  }}
                >
                  ไม่ยกเลิก
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleCancelRequest(requestToCancel.id)}
                >
                  ยืนยันยกเลิก
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Detail Dialog */}
      {selectedRequest && (
        <Dialog
          open={!!selectedRequest}
          onOpenChange={() => setSelectedRequest(null)}
        >
          <DialogContent className="w-full max-w-full min-w-[320px] max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                รายละเอียดการแจ้งซ่อม
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">ข้อมูลการแจ้งซ่อม</h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>หัวข้อ:</strong> {selectedRequest.title}
                    </p>
                    <p>
                      <strong>ผู้แจ้ง:</strong> {selectedRequest.user_name}
                    </p>
                    <p>
                      <strong>อีเมล:</strong> {selectedRequest.user_email}
                    </p>
                    <p>
                      <strong>อุปกรณ์:</strong>{" "}
                      {selectedRequest.equipment_name || "ไม่ระบุ"}
                    </p>
                    <p>
                      <strong>วันที่แจ้ง:</strong>{" "}
                      {new Date(
                        selectedRequest.reported_date
                      ).toLocaleDateString("th-GB")}
                    </p>
                    <div className="flex items-center gap-2">
                      <strong>ความสำคัญ:</strong>
                      <Badge
                        className={cn(priorityColors[selectedRequest.priority])}
                      >
                        {priorityLabels[selectedRequest.priority]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <strong>สถานะ:</strong>
                      <Badge
                        className={cn(statusColors[selectedRequest.status])}
                      >
                        {statusLabels[selectedRequest.status]}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">รายละเอียดปัญหา</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {selectedRequest.description}
                  </p>
                </div>

                {selectedRequest.image_url && (
                  <div>
                    <h4 className="font-semibold mb-2">รูปภาพประกอบ</h4>
                    <img
                      src={selectedRequest.image_url}
                      alt="รูปภาพประกอบ"
                      className="max-w-full h-auto rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {selectedRequest.handled_by_name && (
                  <div>
                    <h4 className="font-semibold mb-2">ข้อมูลผู้ดำเนินการ</h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>ชื่อ:</strong> {selectedRequest.handled_by_name}
                      </p>
                      <p>
                        <strong>อีเมล:</strong>{" "}
                        {selectedRequest.handled_by_email}
                      </p>
                      {selectedRequest.started_date && (
                        <p>
                          <strong>วันที่เริ่มซ่อม:</strong>{" "}
                          {new Date(
                            selectedRequest.started_date
                          ).toLocaleDateString("en-GB")}
                        </p>
                      )}
                      {selectedRequest.completed_date && (
                        <p>
                          <strong>วันที่เสร็จสิ้น:</strong>{" "}
                          {new Date(
                            selectedRequest.completed_date
                          ).toLocaleDateString("en-GB")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {selectedRequest.admin_notes && (
                  <div>
                    <h4 className="font-semibold mb-2">หมายเหตุจากผู้ดูแล</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {selectedRequest.admin_notes}
                    </p>
                  </div>
                )}

                {selectedRequest.repair_notes && (
                  <div>
                    <h4 className="font-semibold mb-2">รายละเอียดการซ่อม</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {selectedRequest.repair_notes}
                    </p>
                  </div>
                )}

                {selectedRequest.repair_cost && (
                  <div>
                    <h4 className="font-semibold mb-2">ค่าใช้จ่าย</h4>
                    <p className="text-sm text-gray-600">
                      {selectedRequest.repair_cost.toLocaleString()} บาท
                    </p>
                  </div>
                )}

                {userRole === "admin" && (
                  <div>
                    <h4 className="font-semibold mb-2">อัพเดทสถานะ</h4>
                    <div className="space-y-3">
                      <div>
                        <Label>สถานะ</Label>
                        <Select
                          value={adminFormData.status}
                          onValueChange={(value) =>
                            setAdminFormData((prev) => ({
                              ...prev,
                              status: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกสถานะ" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">รอดำเนินการ</SelectItem>
                            <SelectItem value="in_progress">
                              กำลังดำเนินการ
                            </SelectItem>
                            <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                            <SelectItem value="cancelled">ยกเลิก</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>หมายเหตุ</Label>
                        <Textarea
                          value={adminFormData.admin_notes}
                          onChange={(e) =>
                            setAdminFormData((prev) => ({
                              ...prev,
                              admin_notes: e.target.value,
                            }))
                          }
                          placeholder="หมายเหตุจากผู้ดูแล"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <Label>วันที่เริ่มซ่อม</Label>
                          <Input
                            type="date"
                            value={adminFormData.started_date}
                            onChange={(e) =>
                              setAdminFormData((prev) => ({
                                ...prev,
                                started_date: e.target.value,
                              }))
                            }
                            onClick={(e) => {
                              (e.target as HTMLInputElement).showPicker?.();
                            }}
                          />
                        </div>
                        <div>
                          <Label>วันที่เสร็จสิ้น</Label>
                          <Input
                            type="date"
                            value={adminFormData.completed_date}
                            onChange={(e) =>
                              setAdminFormData((prev) => ({
                                ...prev,
                                completed_date: e.target.value,
                              }))
                            }
                            onClick={(e) => {
                              (e.target as HTMLInputElement).showPicker?.();
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>ค่าใช้จ่าย (บาท)</Label>
                        <Input
                          type="number"
                          value={adminFormData.repair_cost}
                          onChange={(e) =>
                            setAdminFormData((prev) => ({
                              ...prev,
                              repair_cost: e.target.value,
                            }))
                          }
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <Label>รายละเอียดการซ่อม</Label>
                        <Textarea
                          value={adminFormData.repair_notes}
                          onChange={(e) =>
                            setAdminFormData((prev) => ({
                              ...prev,
                              repair_notes: e.target.value,
                            }))
                          }
                          placeholder="อธิบายการซ่อมที่ทำ"
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedRequest(null)}
                          className="flex-1"
                        >
                          ยกเลิก
                        </Button>
                        <Button
                          onClick={() => handleStatusUpdate(selectedRequest.id)}
                          className="flex-1"
                        >
                          อัพเดทสถานะ
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
