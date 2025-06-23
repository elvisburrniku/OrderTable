
import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { 
  Pencil, 
  Trash2, 
  Plus, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  HelpCircle,
  MessageSquare,
  Star,
  BarChart3,
  Eye,
  EyeOff
} from "lucide-react";
import { motion } from "framer-motion";

interface FeedbackQuestion {
  id: number;
  name: string;
  questionType: string;
  hasNps: boolean;
  hasComments: boolean;
  isActive: boolean;
  sortOrder: number;
}

export default function FeedbackQuestions() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Auto scroll to top when page loads
  useScrollToTop();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<FeedbackQuestion | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [formData, setFormData] = useState({
    name: "",
    questionType: "nps",
    hasNps: true,
    hasComments: true,
    isActive: true,
    sortOrder: 0,
  });

  // Fetch feedback questions
  const { data: questions = [], isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/feedback-questions`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Filter questions
  const filteredQuestions = (questions || []).filter((question: FeedbackQuestion) => {
    const matchesSearch = !searchTerm || 
      question.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.questionType?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && question.isActive) ||
      (statusFilter === "inactive" && !question.isActive);

    const matchesType = typeFilter === "all" || question.questionType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedQuestions = filteredQuestions.slice(startIndex, endIndex);

  // Create question mutation
  const createQuestionMutation = useMutation({
    mutationFn: async (questionData: any) => {
      return apiRequest("POST", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/feedback-questions`, questionData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Question created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/feedback-questions`] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create question",
        variant: "destructive",
      });
    },
  });

  // Update question mutation
  const updateQuestionMutation = useMutation({
    mutationFn: async (questionData: any) => {
      return apiRequest("PUT", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/feedback-questions/${editingQuestion.id}`, questionData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Question updated successfully",
      });
      setEditingQuestion(null);
      resetForm();
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/feedback-questions`] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update question",
        variant: "destructive",
      });
    },
  });

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      return apiRequest("DELETE", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/feedback-questions/${questionId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Question deleted successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/feedback-questions`] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    },
  });

  if (!user || !restaurant) {
    return null;
  }

  const resetForm = () => {
    setFormData({
      name: "",
      questionType: "nps",
      hasNps: true,
      hasComments: true,
      isActive: true,
      sortOrder: 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Question name is required",
        variant: "destructive",
      });
      return;
    }

    if (editingQuestion) {
      updateQuestionMutation.mutate(formData);
    } else {
      createQuestionMutation.mutate(formData);
    }
  };

  const handleEdit = (question: FeedbackQuestion) => {
    setEditingQuestion(question);
    setFormData({
      name: question.name,
      questionType: question.questionType,
      hasNps: question.hasNps,
      hasComments: question.hasComments,
      isActive: question.isActive,
      sortOrder: question.sortOrder,
    });
  };

  const handleDelete = (questionId: number) => {
    if (confirm("Are you sure you want to delete this question?")) {
      deleteQuestionMutation.mutate(questionId);
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'nps':
        return <BarChart3 className="w-4 h-4" />;
      case 'rating':
        return <Star className="w-4 h-4" />;
      case 'text':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getQuestionTypeBadge = (type: string) => {
    const colors = {
      nps: "bg-blue-500 text-white",
      rating: "bg-yellow-500 text-white",
      text: "bg-green-500 text-white"
    };
    return (
      <Badge className={colors[type as keyof typeof colors] || "bg-gray-500 text-white"}>
        <div className="flex items-center space-x-1">
          {getQuestionTypeIcon(type)}
          <span>{type.toUpperCase()}</span>
        </div>
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-2xl font-bold text-gray-900 flex items-center gap-2"
              >
                <HelpCircle className="h-6 w-6 text-green-600" />
                Feedback Questions
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Question</span>
                </Button>
              </motion.div>
            </div>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-sm text-gray-600 mt-2"
            >
              Create and customize feedback questions for your guests. You have the flexibility to add new questions, 
              edit existing ones, and choose the order in which they will be presented to your guests in the feedback form.
            </motion.p>
          </div>

          {/* Filters Section */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Questions</h2>

            {/* Modern Filters Section */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="space-y-6 mb-8"
            >
              {/* Filter Controls Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="h-10 px-4 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200 flex items-center space-x-2 font-medium"
                      >
                        <Filter className="w-4 h-4" />
                        <span>Filters</span>
                        {(statusFilter !== 'all' || typeFilter !== 'all' || searchTerm) && (
                          <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                            {[statusFilter !== 'all', typeFilter !== 'all', searchTerm].filter(Boolean).length}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 transform transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-4">
                      <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Search Input */}
                          <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                            <div className="relative">
                              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                              <Input
                                placeholder="Search by name or type..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-11 border-2 border-gray-200 focus:border-green-500 focus:ring-0 rounded-lg transition-all duration-200"
                              />
                            </div>
                          </div>

                          {/* Status Filter */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                                <SelectValue placeholder="All Status" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg border-2 border-gray-200">
                                <SelectItem value="all" className="rounded-md">All Status</SelectItem>
                                <SelectItem value="active" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <Eye className="w-4 h-4 text-green-500" />
                                    <span>Active</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="inactive" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <EyeOff className="w-4 h-4 text-gray-500" />
                                    <span>Inactive</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Type Filter */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                              <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                                <SelectValue placeholder="All Types" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg border-2 border-gray-200">
                                <SelectItem value="all" className="rounded-md">All Types</SelectItem>
                                <SelectItem value="nps" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <BarChart3 className="w-4 h-4 text-blue-500" />
                                    <span>NPS</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="rating" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <Star className="w-4 h-4 text-yellow-500" />
                                    <span>Rating</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="text" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <MessageSquare className="w-4 h-4 text-green-500" />
                                    <span>Text</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Filter Actions */}
                        {(statusFilter !== 'all' || typeFilter !== 'all' || searchTerm) && (
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span>Active filters:</span>
                              {searchTerm && (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-medium">
                                  Search: "{searchTerm}"
                                </span>
                              )}
                              {statusFilter !== 'all' && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-medium">
                                  Status: {statusFilter}
                                </span>
                              )}
                              {typeFilter !== 'all' && (
                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs font-medium">
                                  Type: {typeFilter}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("all");
                                setTypeFilter("all");
                              }}
                              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            >
                              Clear all
                            </Button>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </motion.div>

            {/* Enhanced Table */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden shadow-sm mt-6"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Question Name
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        NPS
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Comments
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sort Order
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                            <span className="text-gray-500 font-medium">Loading questions...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedQuestions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <HelpCircle className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="text-gray-900 font-medium">No questions found</h3>
                              <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or create a new question</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedQuestions.map((question: FeedbackQuestion, index: number) => (
                        <motion.tr 
                          key={question.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className={`group hover:bg-blue-50 transition-all duration-200 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{question.name}</div>
                          </td>
                          <td className="py-3 px-4">
                            {getQuestionTypeBadge(question.questionType)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {question.hasNps ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              ) : (
                                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {question.hasComments ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              ) : (
                                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge 
                              variant={question.isActive ? "default" : "secondary"}
                              className={question.isActive ? "bg-green-500 text-white" : "bg-gray-500 text-white"}
                            >
                              {question.isActive ? (
                                <div className="flex items-center space-x-1">
                                  <Eye className="w-3 h-3" />
                                  <span>Active</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <EyeOff className="w-3 h-3" />
                                  <span>Inactive</span>
                                </div>
                              )}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600">{question.sortOrder}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(question)}
                                className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-200"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(question.id)}
                                disabled={deleteQuestionMutation.isPending}
                                className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-200 text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="flex items-center justify-between px-6 py-4 border-t bg-gray-50"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(parseInt(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">entries</span>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    {startIndex + 1}-{Math.min(endIndex, filteredQuestions.length)} of {filteredQuestions.length}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 h-8 text-sm"
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="w-8 h-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage <= 2) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 1) {
                          pageNum = totalPages - 2 + i;
                        } else {
                          pageNum = currentPage - 1 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 p-0 ${
                              currentPage === pageNum 
                                ? "bg-green-600 hover:bg-green-700 text-white" 
                                : "hover:bg-green-50"
                            }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="w-8 h-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 h-8 text-sm"
                    >
                      Last
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Question Dialog */}
      <Dialog 
        open={isCreateDialogOpen || !!editingQuestion} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingQuestion(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "Edit Question" : "Create New Question"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Question Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Food Quality"
                required
              />
            </div>

            <div>
              <Label htmlFor="questionType">Question Type</Label>
              <Select
                value={formData.questionType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, questionType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nps">NPS (Net Promoter Score)</SelectItem>
                  <SelectItem value="rating">Rating (1-5 stars)</SelectItem>
                  <SelectItem value="text">Text only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasNps"
                checked={formData.hasNps}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasNps: !!checked }))}
              />
              <Label htmlFor="hasNps">Include NPS scoring</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasComments"
                checked={formData.hasComments}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasComments: !!checked }))}
              />
              <Label htmlFor="hasComments">Allow comments</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: !!checked }))}
              />
              <Label htmlFor="isActive">Active question</Label>
            </div>

            <div>
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingQuestion(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {editingQuestion ? "Update Question" : "Create Question"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
