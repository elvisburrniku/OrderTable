import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Phone, Clock, AlertTriangle, CheckCircle, XCircle, CreditCard, Euro } from 'lucide-react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const voiceAgentRequestSchema = z.object({
  businessJustification: z.string().min(10, 'Please provide a detailed business justification'),
  expectedCallVolume: z.coerce.number().min(1).max(1000),
  requestedLanguages: z.string().default('en')
});

const creditTopUpSchema = z.object({
  amount: z.coerce.number().min(20, 'Minimum top-up is €20').max(500, 'Maximum top-up is €500')
});

type VoiceAgentRequestFormData = z.infer<typeof voiceAgentRequestSchema>;
type CreditTopUpFormData = z.infer<typeof creditTopUpSchema>;

export default function VoiceAgentRequest() {
  const { tenantId, restaurantId } = useParams<{ tenantId: string; restaurantId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'request' | 'credits'>('request');

  // Query for existing request
  const { data: requestData, isLoading: isLoadingRequest } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/voice-agent/request`],
    enabled: !!tenantId && !!restaurantId,
  });

  // Query for credit balance
  const { data: creditsData, isLoading: isLoadingCredits } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/voice-agent/credits`],
    enabled: !!tenantId,
  });

  // Form for voice agent request
  const requestForm = useForm<VoiceAgentRequestFormData>({
    resolver: zodResolver(voiceAgentRequestSchema),
    defaultValues: {
      businessJustification: '',
      expectedCallVolume: 50,
      requestedLanguages: 'en'
    }
  });

  // Form for credit top-up
  const creditForm = useForm<CreditTopUpFormData>({
    resolver: zodResolver(creditTopUpSchema),
    defaultValues: {
      amount: 50
    }
  });

  // Submit voice agent request
  const submitRequestMutation = useMutation({
    mutationFn: async (data: VoiceAgentRequestFormData) => {
      const response = await apiRequest('POST', `/api/tenants/${tenantId}/restaurants/${restaurantId}/voice-agent/request`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Request Submitted',
        description: 'Your voice agent request has been submitted for admin approval.',
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/voice-agent/request`] 
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit voice agent request',
        variant: 'destructive',
      });
    },
  });

  // Top up credits
  const topUpMutation = useMutation({
    mutationFn: async (data: CreditTopUpFormData) => {
      const response = await apiRequest('POST', `/api/tenants/${tenantId}/voice-agent/credits/topup`, data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Payment Intent Created',
        description: `Payment of €${data.amount} is being processed.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to create payment intent',
        variant: 'destructive',
      });
    },
  });

  const onSubmitRequest = (data: VoiceAgentRequestFormData) => {
    submitRequestMutation.mutate(data);
  };

  const onSubmitTopUp = (data: CreditTopUpFormData) => {
    topUpMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'revoked':
        return <Badge variant="outline" className="text-red-600"><XCircle className="w-3 h-3 mr-1" />Revoked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoadingRequest || isLoadingCredits) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Voice Agent Management</h1>
        <p className="text-muted-foreground mt-2">
          Request voice agent activation and manage your credit balance
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-6">
        <Button 
          variant={activeTab === 'request' ? 'default' : 'outline'}
          onClick={() => setActiveTab('request')}
          className="flex items-center gap-2"
        >
          <Phone className="w-4 h-4" />
          Voice Agent Request
        </Button>
        <Button 
          variant={activeTab === 'credits' ? 'default' : 'outline'}
          onClick={() => setActiveTab('credits')}
          className="flex items-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          Credit Management
        </Button>
      </div>

      {activeTab === 'request' && (
        <div className="space-y-6">
          {/* Current Request Status */}
          {requestData?.hasRequest && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Current Request Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Status:</span>
                    {getStatusBadge(requestData.request.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Expected Call Volume:</span>
                      <p className="text-muted-foreground">{requestData.request.expectedCallVolume} calls/month</p>
                    </div>
                    <div>
                      <span className="font-medium">Requested Languages:</span>
                      <p className="text-muted-foreground">{requestData.request.requestedLanguages}</p>
                    </div>
                  </div>

                  <div>
                    <span className="font-medium">Business Justification:</span>
                    <p className="text-muted-foreground mt-1">{requestData.request.businessJustification}</p>
                  </div>

                  {requestData.request.adminNotes && (
                    <div>
                      <span className="font-medium">Admin Notes:</span>
                      <p className="text-muted-foreground mt-1">{requestData.request.adminNotes}</p>
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    Submitted on: {new Date(requestData.request.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* New Request Form */}
          {!requestData?.hasRequest && (
            <Card>
              <CardHeader>
                <CardTitle>Request Voice Agent Activation</CardTitle>
                <CardDescription>
                  Submit a request to activate AI voice agent for your restaurant. Admin approval and €20 minimum credit balance required.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...requestForm}>
                  <form onSubmit={requestForm.handleSubmit(onSubmitRequest)} className="space-y-6">
                    <FormField
                      control={requestForm.control}
                      name="businessJustification"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Justification *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Please explain why you need a voice agent and how it will benefit your restaurant operations..."
                              className="min-h-24"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Provide a detailed explanation of your business needs (minimum 10 characters)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-6">
                      <FormField
                        control={requestForm.control}
                        name="expectedCallVolume"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expected Monthly Calls</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="1000"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Estimated number of calls per month (1-1000)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={requestForm.control}
                        name="requestedLanguages"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Language</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="fr">French</SelectItem>
                                <SelectItem value="es">Spanish</SelectItem>
                                <SelectItem value="de">German</SelectItem>
                                <SelectItem value="it">Italian</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Primary language for voice interactions
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-800">Requirements:</p>
                          <ul className="mt-2 text-amber-700 space-y-1">
                            <li>• Admin approval required</li>
                            <li>• Minimum €20 credit balance</li>
                            <li>• Phone number will be assigned by admin</li>
                            <li>• Usage will be charged from credit balance</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={submitRequestMutation.isPending}
                      className="w-full"
                    >
                      {submitRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'credits' && (
        <div className="space-y-6">
          {/* Credit Balance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="w-5 h-5" />
                Credit Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {creditsData ? (
                <div className="space-y-4">
                  <div className="text-3xl font-bold text-green-600">
                    €{parseFloat(creditsData.creditBalance || '0').toFixed(2)}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Added:</span>
                      <p className="font-medium">€{parseFloat(creditsData.totalCreditsAdded || '0').toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Used:</span>
                      <p className="font-medium">€{parseFloat(creditsData.totalCreditsUsed || '0').toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={creditsData.isActive ? "outline" : "secondary"}>
                        {creditsData.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>

                  {parseFloat(creditsData.creditBalance || '0') < 20 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <p className="text-red-800 font-medium">Low Balance Warning</p>
                      </div>
                      <p className="text-red-700 text-sm mt-1">
                        Your credit balance is below the minimum €20 required for voice agent activation.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Credit system not initialized. Submit a voice agent request first.</p>
              )}
            </CardContent>
          </Card>

          {/* Top Up Credits */}
          <Card>
            <CardHeader>
              <CardTitle>Top Up Credits</CardTitle>
              <CardDescription>
                Add credits to your account. Minimum €20 required for voice agent activation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...creditForm}>
                <form onSubmit={creditForm.handleSubmit(onSubmitTopUp)} className="space-y-6">
                  <FormField
                    control={creditForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (EUR)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="20"
                            max="500"
                            step="10"
                            placeholder="50"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter amount between €20 and €500
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex items-start gap-2">
                      <CreditCard className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-800">Payment Information:</p>
                        <ul className="mt-2 text-blue-700 space-y-1">
                          <li>• Secure payment via Stripe</li>
                          <li>• Credits are non-refundable</li>
                          <li>• Auto-recharge available after first payment</li>
                          <li>• €0.10 per minute typical usage cost</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={topUpMutation.isPending}
                    className="w-full"
                  >
                    {topUpMutation.isPending ? 'Processing...' : `Add €${creditForm.watch('amount')} Credits`}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          {creditsData?.recentTransactions && creditsData.recentTransactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {creditsData.recentTransactions.map((transaction: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className={`font-bold ${transaction.transactionType === 'credit_added' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.transactionType === 'credit_added' ? '+' : '-'}€{parseFloat(transaction.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}