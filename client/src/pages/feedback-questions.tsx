import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus } from "lucide-react";

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
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<FeedbackQuestion | null>(null);
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

  const activeQuestions = questions.filter((q: FeedbackQuestion) => q.isActive);
  const inactiveQuestions = questions.filter((q: FeedbackQuestion) => !q.isActive);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
            <p className="text-sm text-gray-600">
              Do this setup, you can easily create and customize feedback questions for your guests. You have the 
              flexibility to add new questions, edit existing ones, and choose the order in which they will be presented 
              to your guests in the feedback form. This allows you to gather valuable insights from your guests.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Active questions</h3>
              
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-sm font-medium text-gray-700">Name</div>
                <div className="text-sm font-medium text-gray-700">NPS</div>
                <div className="text-sm font-medium text-gray-700">Comments</div>
                <div className="text-sm font-medium text-gray-700">Actions</div>
              </div>

              {activeQuestions.length > 0 ? (
                activeQuestions.map((question: FeedbackQuestion) => (
                  <div key={question.id} className="grid grid-cols-4 gap-4 items-center py-2 border-b border-gray-100">
                    <span className="text-sm">{question.name}</span>
                    <span className="text-sm text-green-600">{question.hasNps ? "●" : "○"}</span>
                    <span className="text-sm text-green-600">{question.hasComments ? "●" : "○"}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(question)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(question.id)}
                        disabled={deleteQuestionMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No active questions yet
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Inactive questions</h3>
              
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-sm font-medium text-gray-700">Name</div>
                <div className="text-sm font-medium text-gray-700">NPS</div>
                <div className="text-sm font-medium text-gray-700">Comments</div>
                <div className="text-sm font-medium text-gray-700">Actions</div>
              </div>

              {inactiveQuestions.length > 0 ? (
                inactiveQuestions.map((question: FeedbackQuestion) => (
                  <div key={question.id} className="grid grid-cols-4 gap-4 items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">{question.name}</span>
                    <span className="text-sm text-gray-400">{question.hasNps ? "●" : "○"}</span>
                    <span className="text-sm text-gray-400">{question.hasComments ? "●" : "○"}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(question)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(question.id)}
                        disabled={deleteQuestionMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  There are no inactive questions
                </div>
              )}
            </div>

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
              <DialogTrigger asChild>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New question
                </Button>
              </DialogTrigger>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}