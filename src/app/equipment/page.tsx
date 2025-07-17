// src/app/equipment/page.tsx - ส่วนที่แก้ไข
"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  Upload,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
// import { supabase } from "@/lib/supabase";

interface Equipment {
  id: number;
  name: string;
  description: string;
  quantity: number;
  available_quantity: number;
  condition: "excellent" | "good" | "fair" | "poor" | "broken";
  created_at: string;
  updated_at: string;
}

interface EquipmentLoan {
  id: number;
  user_id: string; // แก้เป็น string เพราะเป็น clerk_id
  user_name: string;
  user_email: string;
  equipment_id: number;
  equipment_name: string;
  quantity: number;
  loan_date: string;
  return_date: string | null;
  expected_return_date: string;
  status: "borrowed" | "returned" | "overdue" | "lost";
  notes: string;
  returned_by_name: string | null;
  returned_by_email: string | null;
  borrow_evidence_url: string | null;
  return_evidence_url: string | null;
  created_at: string;
  updated_at: string;
}

const conditionColors = {
  excellent: "bg-green-100 text-green-800",
  good: "bg-blue-100 text-blue-800",
  fair: "bg-yellow-100 text-yellow-800",
  poor: "bg-orange-100 text-orange-800",
  broken: "bg-red-100 text-red-800",
};

const statusColors = {
  borrowed: "bg-blue-100 text-blue-800",
  returned: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  lost: "bg-gray-100 text-gray-800",
};

export default function EquipmentPage() {
  const { user, isLoaded } = useUser();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loans, setLoans] = useState<EquipmentLoan[]>([]);
  const [userRole, setUserRole] = useState<"admin" | "user" | null>(null);
  const [activeTab, setActiveTab] = useState<"equipment" | "loans">(
    "equipment"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCondition, setFilterCondition] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null
  );
  const [selectedLoan, setSelectedLoan] = useState<EquipmentLoan | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(
    null
  );
  const [equipmentError, setEquipmentError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  // Form states
  const [equipmentForm, setEquipmentForm] = useState({
    name: "",
    description: "",
    quantity: 1,
    condition: "good" as Equipment["condition"],
  });

  const [borrowForm, setBorrowForm] = useState({
    quantity: 1,
    expected_return_date: "",
    notes: "",
    evidence_file: null as File | null,
  });

  const [returnForm, setReturnForm] = useState({
    notes: "",
    evidence_file: null as File | null,
  });

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(
    null
  );

  // File upload states
  const [borrowFilePreview, setBorrowFilePreview] = useState<string>("");
  const [returnFilePreview, setReturnFilePreview] = useState<string>("");

  const [showBorrowFileCancel, setShowBorrowFileCancel] = useState(false);
  const [showReturnFileCancel, setShowReturnFileCancel] = useState(false);
  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        try {
          const response = await fetch(`/api/users/role?clerk_id=${user.id}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });
          if (response.ok) {
            const data = await response.json();
            setUserRole(data.role);
          } else {
            console.error("Failed to fetch user role:", response.status);
            // ตั้งค่า default เป็น user ถ้าไม่พบ role
            setUserRole("user");
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole("user"); // ตั้งค่า default
        }
      }
    };

    if (isLoaded && user) {
      checkUserRole();
    }
  }, [user, isLoaded]);

  // ยกเลิกไฟล์การยืม
  const cancelBorrowFile = () => {
    setBorrowForm({ ...borrowForm, evidence_file: null });
    setBorrowFilePreview("");
    setShowBorrowFileCancel(false);
  };

  // ยกเลิกไฟล์การคืน
  const cancelReturnFile = () => {
    setReturnForm({ ...returnForm, evidence_file: null });
    setReturnFilePreview("");
    setShowReturnFileCancel(false);
  };

  // Fetch equipment - แก้ไขแล้ว
  const fetchEquipment = async () => {
    try {
      console.log("Fetching equipment...");
      const response = await fetch("/api/equipment", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Equipment response status:", response.status);
      console.log("Equipment response ok:", response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log("Equipment data:", data);
        setEquipment(Array.isArray(data) ? data : []);
      } else {
        const errorText = await response.text();
        console.error(`HTTP Error ${response.status}:`, errorText);
        alert(
          `เกิดข้อผิดพลาดในการดึงข้อมูลอุปกรณ์: ${response.status} - ${errorText}`
        );
        setEquipment([]); // ตั้งค่าเป็น array ว่าง
      }
    } catch (error) {
      console.error("Error fetching equipment:", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
      setEquipment([]); // ตั้งค่าเป็น array ว่าง
    }
  };

  // Fetch loans - แก้ไขใหม่
  const fetchLoans = async () => {
    try {
      console.log("Fetching loans...");
      const response = await fetch("/api/equipment/loans", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-cache", // บังคับไม่ให้ cache
      });

      console.log("Loans response status:", response.status);
      console.log("Loans response ok:", response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log("Loans data:", data);
        setLoans(Array.isArray(data) ? data : []);
      } else {
        const errorText = await response.text();
        console.error(`HTTP Error ${response.status}:`, errorText);

        // ถ้าเป็น 405 แสดงว่า method ไม่ถูกรับรอง
        if (response.status === 405) {
          console.error(
            "Method Not Allowed - ตรวจสอบว่า GET method ถูก export ใน API route"
          );
        }

        alert(
          `เกิดข้อผิดพลาดในการดึงข้อมูลการยืม: ${response.status} - ${errorText}`
        );
        setLoans([]); // ตั้งค่าเป็น array ว่าง
      }
    } catch (error) {
      console.error("Error fetching loans:", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ (loans)");
      setLoans([]); // ตั้งค่าเป็น array ว่าง
    }
  };

  // Load data when user role is available
  useEffect(() => {
    if (userRole) {
      console.log("User role detected:", userRole);
      Promise.all([fetchEquipment(), fetchLoans()])
        .then(() => {
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error loading data:", error);
          setLoading(false);
        });
    }
  }, [userRole]);

  // Handle file selection for borrow
  const handleBorrowFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      setBorrowForm({ ...borrowForm, evidence_file: file });

      const reader = new FileReader();
      reader.onload = (e) => {
        setBorrowFilePreview(e.target?.result as string);
        setShowBorrowFileCancel(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle file selection for return
  const handleReturnFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      setReturnForm({ ...returnForm, evidence_file: file });

      const reader = new FileReader();
      reader.onload = (e) => {
        setReturnFilePreview(e.target?.result as string);
        setShowReturnFileCancel(true);
      };
      reader.readAsDataURL(file);
    }
  };
  // Handle save equipment
  const handleSaveEquipment = async () => {
    if (!equipmentForm.name.trim()) {
      setEquipmentError("กรุณากรอกชื่ออุปกรณ์");
      return;
    }

    if (!equipmentForm.description.trim()) {
      setEquipmentError("กรุณากรอกรายละเอียดอุปกรณ์");
      return;
    }

    if (equipmentForm.quantity < 1) {
      setEquipmentError("จำนวนต้องมากกว่า 0");
      return;
    }

    setEquipmentError("");

    try {
      const url = editingEquipment
        ? `/api/equipment/${editingEquipment.id}`
        : "/api/equipment";

      const method = editingEquipment ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(equipmentForm),
      });

      if (response.ok) {
        await fetchEquipment();
        setShowAddEquipment(false);
        setEditingEquipment(null);
        resetEquipmentForm();
      } else {
        const errorData = await response.json();
        setEquipmentError(errorData.error || "เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (error) {
      console.error("Error saving equipment:", error);
      setEquipmentError("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    }
  };

  // Handle delete equipment
  const handleDeleteEquipment = async (equipment: Equipment) => {
    setEquipmentToDelete(equipment);
    setShowDeleteModal(true);
  };

  const confirmDeleteEquipment = async () => {
    if (!equipmentToDelete) return;

    try {
      const response = await fetch(`/api/equipment/${equipmentToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchEquipment();
        setShowDeleteModal(false);
        setEquipmentToDelete(null);
      } else {
        alert("เกิดข้อผิดพลาดในการลบอุปกรณ์");
      }
    } catch (error) {
      console.error("Error deleting equipment:", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    }
  };

  // ฟังก์ชัน handleBorrowEquipment
  const handleBorrowEquipment = async () => {
    if (!selectedEquipment || !user) return;

    // เพิ่มการ validate ข้อมูล
    if (!borrowForm.quantity || !borrowForm.expected_return_date) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    // ตรวจสอบจำนวนที่ขอยืม
    if (borrowForm.quantity > selectedEquipment.available_quantity) {
      alert(
        `จำนวนที่ขอยืมเกินจำนวนที่มีอยู่ (มีอยู่ ${selectedEquipment.available_quantity} ชิ้น)`
      );
      return;
    }

    try {
      console.log("Starting borrow process...");

      // เพิ่ม loading state
      setIsUploading(true); // ต้องเพิ่ม state นี้

      let evidenceUrl = null;

      // อัปโหลดไฟล์หลักฐาน (ถ้ามี)
      if (borrowForm.evidence_file) {
        try {
          console.log(
            "Uploading evidence file:",
            borrowForm.evidence_file.name
          );

          // ใช้ uploadFileWithCompression แทน uploadFile
          evidenceUrl = await uploadFileWithCompression(
            borrowForm.evidence_file,
            "borrow"
          );

          console.log("Evidence uploaded successfully:", evidenceUrl);
        } catch (uploadError) {
          console.error("Error uploading evidence:", uploadError);

          // แสดง error message ที่ละเอียดขึ้น
          let errorMessage = "Unknown error";
          if (uploadError instanceof Error) {
            if (uploadError.message.includes("timeout")) {
              errorMessage = "การอัปโหลดใช้เวลานานเกินไป กรุณาลองใหม่";
            } else if (uploadError.message.includes("File size too large")) {
              errorMessage = "ไฟล์มีขนาดใหญ่เกินไป (จำกัดที่ 5MB)";
            } else if (uploadError.message.includes("Invalid file type")) {
              errorMessage = "ประเภทไฟล์ไม่ถูกต้อง รองรับเฉพาะ JPEG, PNG, WebP";
            } else {
              errorMessage = uploadError.message;
            }
          }

          // ให้ผู้ใช้เลือกว่าจะดำเนินการต่อโดยไม่มีหลักฐานหรือไม่
          const continueWithoutEvidence = confirm(
            `การอัปโหลดหลักฐานล้มเหลว: ${errorMessage}\n\nต้องการดำเนินการยืมโดยไม่มีหลักฐานหรือไม่?`
          );

          if (!continueWithoutEvidence) {
            return; // หยุดการดำเนินการ
          }

          evidenceUrl = null; // ตั้งค่าเป็น null เพื่อดำเนินการต่อ
        }
      }

      console.log("Creating loan request...");
      const loanData = {
        equipment_id: selectedEquipment.id,
        quantity: borrowForm.quantity,
        expected_return_date: borrowForm.expected_return_date,
        notes: borrowForm.notes,
        borrow_evidence_url: evidenceUrl,
      };

      console.log("Loan data:", loanData);

      const response = await fetch("/api/equipment/loans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loanData),
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("Loan created successfully:", result);

        // รีเฟรชข้อมูล
        await Promise.all([fetchEquipment(), fetchLoans()]);

        // รีเซ็ตฟอร์ม
        setShowBorrowModal(false);
        setSelectedEquipment(null);
        resetBorrowForm();

        alert("ยืมอุปกรณ์สำเร็จ");
      } else {
        const errorData = await response.json();
        console.error("Server error:", errorData);
        alert(`เกิดข้อผิดพลาด: ${errorData.error || "Unknown server error"}`);
      }
    } catch (error) {
      console.error("Error borrowing equipment:", error);

      // แสดง error message ที่ละเอียดขึ้น
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert(`เกิดข้อผิดพลาดในการยืมอุปกรณ์: ${errorMessage}`);
    } finally {
      setIsUploading(false); // ปิด loading state
    }
  };

  // แก้ไขฟังก์ชัน uploadFile ให้ใช้ authenticated client
  const uploadFile = async (
    file: File,
    folder: string = "equipment-evidence"
  ): Promise<string> => {
    try {
      console.log("Starting file upload:", {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      // ตรวจสอบขนาดไฟล์ (จำกัดที่ 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error(
          `File size too large. Maximum size is ${maxSize / 1024 / 1024}MB`
        );
      }

      // ตรวจสอบประเภทไฟล์
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          "Invalid file type. Only JPEG, PNG, and WebP are allowed."
        );
      }

      const userId = user?.id || "anonymous";

      // สร้าง FormData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      formData.append("userId", userId);

      console.log("Uploading file...");
      const startTime = performance.now();

      // ส่งคำขอพร้อม timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 วินาที timeout

      try {
        const response = await fetch("/api/upload-evidence", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const endTime = performance.now();
        console.log(`Upload completed in ${Math.round(endTime - startTime)}ms`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const { publicUrl } = await response.json();
        console.log("File uploaded successfully:", publicUrl);
        return publicUrl;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (
          typeof fetchError === "object" &&
          fetchError !== null &&
          "name" in fetchError &&
          typeof (fetchError as { name?: unknown }).name === "string" &&
          (fetchError as { name: string }).name === "AbortError"
        ) {
          throw new Error("Upload timeout - please try again");
        }
        throw fetchError;
      }
    } catch (error) {
      console.error("Error in uploadFile:", error);
      throw error;
    }
  };

  // 3. เพิ่ม image compression สำหรับไฟล์ขนาดใหญ่
  const compressImage = (
    file: File,
    maxWidth: number = 1920,
    quality: number = 0.8
  ): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new Image();

      img.onload = () => {
        // คำนวณขนาดใหม่
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // วาดรูปลงใน canvas
        ctx.drawImage(img, 0, 0, width, height);

        // แปลงเป็น blob
        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob!], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // 4. แก้ไข uploadFile ให้รองรับ compression
  const uploadFileWithCompression = async (
    file: File,
    folder: string = "equipment-evidence"
  ): Promise<string> => {
    try {
      let fileToUpload = file;

      // ถ้าไฟล์ใหญ่กว่า 1MB และเป็นรูปภาพ ให้บีบอัด
      if (file.size > 1024 * 1024 && file.type.startsWith("image/")) {
        console.log("Compressing image...");
        const compressionStart = performance.now();
        fileToUpload = await compressImage(file, 1920, 0.8);
        const compressionEnd = performance.now();
        console.log(
          `Image compressed in ${Math.round(
            compressionEnd - compressionStart
          )}ms`
        );
        console.log(
          `Size reduced from ${Math.round(file.size / 1024)}KB to ${Math.round(
            fileToUpload.size / 1024
          )}KB`
        );
      }

      return await uploadFile(fileToUpload, folder);
    } catch (error) {
      console.error("Error in uploadFileWithCompression:", error);
      throw error;
    }
  };

  // Handle return equipment - แก้ไขแล้ว
  const handleReturnEquipment = async () => {
    if (!selectedLoan) return;

    try {
      let evidenceUrl = null;

      if (returnForm.evidence_file) {
        evidenceUrl = await uploadFile(returnForm.evidence_file, "return");
      }

      const response = await fetch(
        `/api/equipment/loans/${selectedLoan.id}/return`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            notes: returnForm.notes,
            return_evidence_url: evidenceUrl,
          }),
        }
      );

      if (response.ok) {
        await Promise.all([fetchEquipment(), fetchLoans()]);
        setShowReturnModal(false);
        setSelectedLoan(null);
        resetReturnForm();
        alert("คืนอุปกรณ์สำเร็จ");
      } else {
        const errorData = await response.json();
        alert(`เกิดข้อผิดพลาด: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error returning equipment:", error);
      alert("เกิดข้อผิดพลาดในการคืนอุปกรณ์");
    }
  };

  const resetEquipmentForm = () => {
    setEquipmentForm({
      name: "",
      description: "",
      quantity: 1,
      condition: "good",
    });
    setEquipmentError("");
  };

  const resetBorrowForm = () => {
    setBorrowForm({
      quantity: 1,
      expected_return_date: "",
      notes: "",
      evidence_file: null,
    });
    setBorrowFilePreview("");
  };

  const resetReturnForm = () => {
    setReturnForm({
      notes: "",
      evidence_file: null,
    });
    setReturnFilePreview("");
  };

  const startEdit = (item: Equipment) => {
    setEditingEquipment(item);
    setEquipmentForm({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      condition: item.condition,
    });
    setShowAddEquipment(true);
  };

  const startBorrow = (item: Equipment) => {
    setSelectedEquipment(item);
    setShowBorrowModal(true);
  };

  const startReturn = (loan: EquipmentLoan) => {
    setSelectedLoan(loan);
    setShowReturnModal(true);
  };

  const showImage = (url: string) => {
    setSelectedImageUrl(url);
    setShowImageModal(true);
  };

  // Filter equipment
  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCondition =
      filterCondition === "all" || item.condition === filterCondition;
    return matchesSearch && matchesCondition;
  });

  // Filter loans
  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      loan.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.user_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || loan.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Get user's active loans
  const userLoans = loans.filter(
    (loan) => loan.user_email === user?.emailAddresses[0]?.emailAddress
  );

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">จัดการอุปกรณ์</h1>
        {userRole === "admin" && (
          <Button
            onClick={() => setShowAddEquipment(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่มอุปกรณ์</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab("equipment")}
          className={cn(
            "px-4 py-2 rounded-md font-medium transition-colors",
            activeTab === "equipment"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Package className="h-4 w-4 inline mr-2" />
          อุปกรณ์ทั้งหมด
        </button>
        <button
          onClick={() => setActiveTab("loans")}
          className={cn(
            "px-4 py-2 rounded-md font-medium transition-colors",
            activeTab === "loans"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Calendar className="h-4 w-4 inline mr-2" />
          {userRole === "admin" ? "การยืม/คืนทั้งหมด" : "การยืมของฉัน"}
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="ค้นหาอุปกรณ์..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {activeTab === "equipment" && (
          <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">สภาพทั้งหมด</option>
            <option value="excellent">ดีเยี่ยม</option>
            <option value="good">ดี</option>
            <option value="fair">พอใช้</option>
            <option value="poor">แย่</option>
            <option value="broken">เสียหาย</option>
          </select>
        )}

        {activeTab === "loans" && (
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="borrowed">กำลังยืม</option>
            <option value="returned">คืนแล้ว</option>
            <option value="overdue">เกินกำหนด</option>
            <option value="lost">สูญหาย</option>
          </select>
        )}
      </div>

      {/* Equipment Tab */}
      {activeTab === "equipment" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipment.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  {userRole === "admin" && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteEquipment(item)} // เปลี่ยนจาก handleDeleteEquipment(item.id)
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{item.description}</p>

                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-gray-500">
                    <div>จำนวนทั้งหมด: {item.quantity}</div>
                    <div>ว่าง: {item.available_quantity}</div>
                  </div>
                  <Badge className={conditionColors[item.condition]}>
                    {item.condition === "excellent" && "ดีเยี่ยม"}
                    {item.condition === "good" && "ดี"}
                    {item.condition === "fair" && "พอใช้"}
                    {item.condition === "poor" && "แย่"}
                    {item.condition === "broken" && "เสียหาย"}
                  </Badge>
                </div>

                {item.available_quantity > 0 && item.condition !== "broken" && (
                  <Button
                    onClick={() => startBorrow(item)}
                    className="w-full"
                    disabled={item.available_quantity === 0}
                  >
                    ยืมอุปกรณ์
                  </Button>
                )}

                {item.available_quantity === 0 && (
                  <Button disabled className="w-full">
                    ไม่มีอุปกรณ์ว่าง
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2">กำลังอัปโหลด...</p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && equipmentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  ยืนยันการลบอุปกรณ์
                </h3>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                คุณแน่ใจหรือไม่ที่จะลบอุปกรณ์นี้? การลบจะไม่สามารถกู้คืนได้
              </p>

              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex items-start">
                  <Package className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {equipmentToDelete.name}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {equipmentToDelete.description}
                    </p>
                    <div className="flex items-center mt-2 space-x-4">
                      <span className="text-sm text-gray-500">
                        จำนวน: {equipmentToDelete.quantity}
                      </span>
                      <Badge
                        className={conditionColors[equipmentToDelete.condition]}
                      >
                        {equipmentToDelete.condition === "excellent" &&
                          "ดีเยี่ยม"}
                        {equipmentToDelete.condition === "good" && "ดี"}
                        {equipmentToDelete.condition === "fair" && "พอใช้"}
                        {equipmentToDelete.condition === "poor" && "แย่"}
                        {equipmentToDelete.condition === "broken" && "เสียหาย"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={confirmDeleteEquipment}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                ลบอุปกรณ์
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setEquipmentToDelete(null);
                }}
                className="flex-1"
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loans Tab */}
      {activeTab === "loans" && (
        <div className="space-y-4">
          {(userRole === "admin" ? filteredLoans : userLoans).map((loan) => (
            <Card key={loan.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {loan.equipment_name}
                    </h3>
                    <p className="text-gray-600">
                      ผู้ยืม: {loan.user_name} ({loan.user_email})
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={statusColors[loan.status]}>
                      {loan.status === "borrowed" && "กำลังยืม"}
                      {loan.status === "returned" && "คืนแล้ว"}
                      {loan.status === "overdue" && "เกินกำหนด"}
                      {loan.status === "lost" && "สูญหาย"}
                    </Badge>
                    {loan.status === "borrowed" && (
                      <Button size="sm" onClick={() => startReturn(loan)}>
                        คืนอุปกรณ์
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                  <div>
                    <Clock className="h-4 w-4 inline mr-1" />
                    วันที่ยืม:{" "}
                    {new Date(loan.loan_date).toLocaleDateString("th-TH")}
                  </div>
                  <div>
                    <Calendar className="h-4 w-4 inline mr-1" />
                    กำหนดคืน:{" "}
                    {new Date(loan.expected_return_date).toLocaleDateString(
                      "th-TH"
                    )}
                  </div>
                  <div>จำนวน: {loan.quantity}</div>
                </div>

                {/* Evidence Images */}
                <div className="flex gap-4 mb-4">
                  {loan.borrow_evidence_url && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        หลักฐานการยืม:
                      </p>
                      <div
                        className="relative w-24 h-24 border rounded-lg overflow-hidden cursor-pointer hover:opacity-80"
                        onClick={() => showImage(loan.borrow_evidence_url!)}
                      >
                        <img
                          src={loan.borrow_evidence_url}
                          alt="หลักฐานการยืม"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 flex items-center justify-center">
                          <Eye className="h-4 w-4 text-white opacity-0 hover:opacity-100" />
                        </div>
                      </div>
                    </div>
                  )}

                  {loan.return_evidence_url && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        หลักฐานการคืน:
                      </p>
                      <div
                        className="relative w-24 h-24 border rounded-lg overflow-hidden cursor-pointer hover:opacity-80"
                        onClick={() => showImage(loan.return_evidence_url!)}
                      >
                        <img
                          src={loan.return_evidence_url}
                          alt="หลักฐานการคืน"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 flex items-center justify-center">
                          <Eye className="h-4 w-4 text-white opacity-0 hover:opacity-100" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {loan.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">
                      หมายเหตุ: {loan.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Equipment Modal - แก้ไขส่วน error message */}
      {showAddEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingEquipment ? "แก้ไขอุปกรณ์" : "เพิ่มอุปกรณ์"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddEquipment(false);
                  setEditingEquipment(null);
                  resetEquipmentForm();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Error Message */}
            {equipmentError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-sm text-red-700">{equipmentError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  ชื่ออุปกรณ์ <span className="text-red-500">*</span>
                </label>
                <Input
                  value={equipmentForm.name}
                  onChange={(e) => {
                    setEquipmentForm({
                      ...equipmentForm,
                      name: e.target.value,
                    });
                    if (equipmentError) setEquipmentError(""); // Clear error when user types
                  }}
                  placeholder="ชื่ออุปกรณ์"
                  className={
                    equipmentError && !equipmentForm.name.trim()
                      ? "border-red-300"
                      : ""
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  รายละเอียด <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={equipmentForm.description}
                  onChange={(e) => {
                    setEquipmentForm({
                      ...equipmentForm,
                      description: e.target.value,
                    });
                    if (equipmentError) setEquipmentError(""); // Clear error when user types
                  }}
                  placeholder="รายละเอียดอุปกรณ์"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    equipmentError && !equipmentForm.description.trim()
                      ? "border-red-300"
                      : "border-gray-300"
                  }`}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  จำนวน <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  value={equipmentForm.quantity}
                  onChange={(e) => {
                    setEquipmentForm({
                      ...equipmentForm,
                      quantity: parseInt(e.target.value) || 1,
                    });
                    if (equipmentError) setEquipmentError(""); // Clear error when user types
                  }}
                  className={
                    equipmentError && equipmentForm.quantity < 1
                      ? "border-red-300"
                      : ""
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">สภาพ</label>
                <select
                  value={equipmentForm.condition}
                  onChange={(e) =>
                    setEquipmentForm({
                      ...equipmentForm,
                      condition: e.target.value as Equipment["condition"],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="excellent">ดีเยี่ยม</option>
                  <option value="good">ดี</option>
                  <option value="fair">พอใช้</option>
                  <option value="poor">แย่</option>
                  <option value="broken">เสียหาย</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button onClick={handleSaveEquipment} className="flex-1">
                  {editingEquipment ? "บันทึกการแก้ไข" : "เพิ่มอุปกรณ์"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddEquipment(false);
                    setEditingEquipment(null);
                    resetEquipmentForm();
                  }}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Borrow Equipment Modal */}
      {showBorrowModal && selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">ยืมอุปกรณ์</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowBorrowModal(false);
                  setSelectedEquipment(null);
                  resetBorrowForm();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-md">
              <h3 className="font-semibold">{selectedEquipment.name}</h3>
              <p className="text-sm text-gray-600">
                {selectedEquipment.description}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                มีอุปกรณ์ว่าง: {selectedEquipment.available_quantity} จาก{" "}
                {selectedEquipment.quantity}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  จำนวนที่ต้องการยืม
                </label>
                <Input
                  type="number"
                  min="1"
                  max={selectedEquipment.available_quantity}
                  value={borrowForm.quantity}
                  onChange={(e) =>
                    setBorrowForm({
                      ...borrowForm,
                      quantity: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  วันที่คาดว่าจะคืน
                </label>
                <DatePicker
                  selected={
                    borrowForm.expected_return_date
                      ? new Date(borrowForm.expected_return_date)
                      : null
                  }
                  onChange={(date) => {
                    if (date) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(
                        2,
                        "0"
                      );
                      const day = String(date.getDate()).padStart(2, "0");
                      const formattedDate = `${year}-${month}-${day}`;
                      setBorrowForm({
                        ...borrowForm,
                        expected_return_date: formattedDate,
                      });
                    }
                  }}
                  dateFormat="dd/MM/yyyy"
                  minDate={new Date()}
                  placeholderText="เลือกวันที่"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  wrapperClassName="w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  หลักฐานการยืม
                  <span className="text-xs text-gray-500 ml-2">
                    รูปภาพเท่านั้น
                  </span>
                </label>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-2 cursor-pointer px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">เลือกรูปภาพ</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBorrowFileChange}
                      className="hidden"
                    />
                  </label>
                  {borrowForm.evidence_file && (
                    <span className="text-sm text-green-600 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      เลือกไฟล์แล้ว
                    </span>
                  )}
                </div>

                {borrowFilePreview && (
                  <div className="mt-2 relative">
                    <img
                      src={borrowFilePreview}
                      alt="ตัวอย่างรูปภาพ"
                      className="w-32 h-32 object-cover border rounded-md"
                    />
                    {showBorrowFileCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelBorrowFile}
                        className="absolute top-0 right-0 bg-white hover:bg-red-500 text-black hover:text-white rounded-full p-1 border border-gray-300"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleBorrowEquipment}
                  className="flex-1"
                  disabled={!borrowForm.expected_return_date}
                >
                  ยืมอุปกรณ์
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBorrowModal(false);
                    setSelectedEquipment(null);
                    resetBorrowForm();
                  }}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Equipment Modal */}
      {showReturnModal && selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">คืนอุปกรณ์</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowReturnModal(false);
                  setSelectedLoan(null);
                  resetReturnForm();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-md">
              <h3 className="font-semibold">{selectedLoan.equipment_name}</h3>
              <p className="text-sm text-gray-600">
                จำนวนที่ยืม: {selectedLoan.quantity}
              </p>
              <p className="text-sm text-gray-600">
                วันที่ยืม:{" "}
                {new Date(selectedLoan.loan_date).toLocaleDateString("th-TH")}
              </p>
              <p className="text-sm text-gray-600">
                กำหนดคืน:{" "}
                {new Date(selectedLoan.expected_return_date).toLocaleDateString(
                  "th-TH"
                )}
              </p>

              {/* Show overdue warning */}
              {new Date(selectedLoan.expected_return_date) < new Date() && (
                <div className="mt-2 flex items-center text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">เกินกำหนดคืนแล้ว</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  หมายเหตุการคืน (ไม่บังคับ)
                </label>
                <textarea
                  value={returnForm.notes}
                  onChange={(e) =>
                    setReturnForm({ ...returnForm, notes: e.target.value })
                  }
                  placeholder="สภาพอุปกรณ์เมื่อคืน, ปัญหาที่พบ, หรือหมายเหตุอื่นๆ"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  หลักฐานการคืน
                  <span className="text-xs text-gray-500 ml-2">
                    รูปภาพเท่านั้น
                  </span>
                </label>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-2 cursor-pointer px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">เลือกรูปภาพ</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReturnFileChange}
                      className="hidden"
                    />
                  </label>
                  {returnForm.evidence_file && (
                    <span className="text-sm text-green-600 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      เลือกไฟล์แล้ว
                    </span>
                  )}
                </div>

                {returnFilePreview && (
                  <div className="mt-2 relative">
                    <img
                      src={returnFilePreview}
                      alt="ตัวอย่างรูปภาพ"
                      className="w-32 h-32 object-cover border rounded-md"
                    />
                    {showReturnFileCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelBorrowFile}
                        className="absolute top-0 right-0 bg-white hover:bg-red-500 text-black hover:text-white rounded-full p-1 border border-gray-300"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex space-x-2 pt-4">
                <Button onClick={handleReturnEquipment} className="flex-1">
                  คืนอุปกรณ์
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReturnModal(false);
                    setSelectedLoan(null);
                    resetReturnForm();
                  }}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 z-10 bg-white hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={selectedImageUrl}
              alt="หลักฐาน"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
