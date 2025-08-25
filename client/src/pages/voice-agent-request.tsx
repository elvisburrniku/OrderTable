import { useState, useEffect } from 'react';
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
import { Phone, Clock, AlertTriangle, CheckCircle, XCircle, CreditCard, Euro, Copy, History, Play, Mic, Settings } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'request' | 'credits' | 'call-logs' | 'elevenlabs'>('request');
  const [callLogsPage, setCallLogsPage] = useState(1);

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

  // Query for call logs
  const { data: callLogsData, isLoading: isLoadingCallLogs } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/voice-agent/call-logs`, callLogsPage],
    enabled: !!tenantId && !!restaurantId && activeTab === 'call-logs',
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
      <div className="flex flex-wrap gap-2 mb-6">
        <Button 
          variant={activeTab === 'request' ? 'default' : 'outline'}
          onClick={() => setActiveTab('request')}
          className="flex items-center gap-2"
        >
          <Phone className="w-4 h-4" />
          Voice Agent Request
        </Button>
        <Button 
          variant={activeTab === 'elevenlabs' ? 'default' : 'outline'}
          onClick={() => setActiveTab('elevenlabs')}
          className="flex items-center gap-2"
        >
          <Mic className="w-4 h-4" />
          ElevenLabs Setup
        </Button>
        <Button 
          variant={activeTab === 'credits' ? 'default' : 'outline'}
          onClick={() => setActiveTab('credits')}
          className="flex items-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          Credit Management
        </Button>
        <Button 
          variant={activeTab === 'call-logs' ? 'default' : 'outline'}
          onClick={() => setActiveTab('call-logs')}
          className="flex items-center gap-2"
        >
          <History className="w-4 h-4" />
          Call History
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

                  {/* Phone Number Display for Approved Requests */}
                  {requestData.request.status === 'approved' && requestData.phoneNumber && (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                      <h4 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2 mb-2">
                        <Phone className="w-4 h-4" />
                        AI Agent Phone Number
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg p-3 border">
                          <div>
                            <p className="font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {requestData.phoneNumber.phoneNumber}
                            </p>
                            {requestData.phoneNumber.friendlyName && (
                              <p className="text-sm text-muted-foreground">
                                {requestData.phoneNumber.friendlyName}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(requestData.phoneNumber.phoneNumber);
                              toast({
                                title: "Phone number copied",
                                description: "Phone number has been copied to your clipboard"
                              });
                            }}
                            className="ml-4"
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-300">
                          <p className="font-medium">✅ Your AI Voice Agent is Active!</p>
                          <p>Customers can call this number to make reservations, ask questions, or get information about your restaurant. The AI agent will handle calls 24/7 and can process bookings directly into your system.</p>
                        </div>
                        <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800 rounded p-2">
                          <p><strong>Pro Tip:</strong> Add this number to your website, business cards, and Google My Business listing to let customers easily reach your AI assistant.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Re-request button for rejected/revoked requests */}
                  {(requestData.request.status === 'rejected' || requestData.request.status === 'revoked') && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-3">
                        {requestData.request.status === 'rejected' 
                          ? 'Your request was rejected. You can submit a new request with updated information.'
                          : 'Your voice agent access was revoked. You can submit a new request for reactivation.'
                        }
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Reset form with previous data
                          requestForm.reset({
                            businessJustification: requestData.request.businessJustification,
                            expectedCallVolume: requestData.request.expectedCallVolume,
                            requestedLanguages: requestData.request.requestedLanguages
                          });
                          // Scroll to form
                          const formElement = document.getElementById('new-request-form');
                          if (formElement) {
                            formElement.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className="w-full sm:w-auto"
                      >
                        Submit New Request
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* New Request Form */}
          {(!requestData?.hasRequest || requestData?.request?.status === 'rejected' || requestData?.request?.status === 'revoked') && (
            <Card id="new-request-form">
              <CardHeader>
                <CardTitle>
                  {!requestData?.hasRequest ? 'Request Voice Agent Activation' : 'Submit New Request'}
                </CardTitle>
                <CardDescription>
                  {!requestData?.hasRequest 
                    ? 'Submit a request to activate AI voice agent for your restaurant. Admin approval and €20 minimum credit balance required.'
                    : 'Submit a new request with updated information. Previous request data has been pre-filled below.'
                  }
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

      {activeTab === 'elevenlabs' && (
        <ElevenLabsConfig tenantId={tenantId} restaurantId={restaurantId} />
      )}

      {activeTab === 'call-logs' && (
        <div className="space-y-6">
          {/* Call Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Call Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {callLogsData?.callLogs?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Calls</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    €{parseFloat(callLogsData?.totalSpending || '0').toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Spending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
              <CardDescription>
                View all AI voice agent calls with transcriptions and customer interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCallLogs ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : callLogsData?.callLogs?.length > 0 ? (
                <div className="space-y-4">
                  {callLogsData.callLogs.map((call: any) => (
                    <div key={call.id} className="border rounded-lg p-4 space-y-3">
                      {/* Call Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="font-medium">{call.callerPhone}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(call.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {call.duration ? `${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, '0')}` : 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">Duration</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600">
                              €{parseFloat(call.cost || '0').toFixed(4)}
                            </p>
                            <p className="text-xs text-muted-foreground">Cost</p>
                          </div>
                          <Badge 
                            variant={call.callStatus === 'completed' ? 'default' : 
                                   call.callStatus === 'failed' ? 'destructive' : 'secondary'}
                          >
                            {call.callStatus || 'unknown'}
                          </Badge>
                        </div>
                      </div>

                      {/* Transcription */}
                      {call.transcription && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Call Transcription
                          </h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {call.transcription}
                          </p>
                        </div>
                      )}

                      {/* Booking Details */}
                      {call.bookingDetails && (
                        <div className="bg-blue-50 dark:bg-blue-950 rounded-md p-3">
                          <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">
                            Booking Information
                          </h4>
                          <div className="text-sm text-blue-700 dark:text-blue-300">
                            <pre className="whitespace-pre-wrap">
                              {typeof call.bookingDetails === 'string' 
                                ? call.bookingDetails 
                                : JSON.stringify(call.bookingDetails, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Recording */}
                      {call.recordingUrl && (
                        <div className="flex items-center gap-2 pt-2">
                          <Play className="w-4 h-4 text-gray-500" />
                          <a 
                            href={call.recordingUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            Play Recording
                          </a>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Pagination */}
                  {callLogsData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setCallLogsPage(prev => Math.max(1, prev - 1))}
                        disabled={callLogsPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {callLogsPage} of {callLogsData.pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setCallLogsPage(prev => Math.min(callLogsData.pagination.totalPages, prev + 1))}
                        disabled={callLogsPage === callLogsData.pagination.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No Calls Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                    Once customers start calling your AI voice agent, their call logs and transcriptions will appear here.
                  </p>
                  {requestData?.phoneNumber && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Your AI agent phone number: <strong>{requestData.phoneNumber.phoneNumber}</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ElevenLabs Configuration Component
function ElevenLabsConfig({ tenantId, restaurantId }: { tenantId: string; restaurantId: string }) {
  const [voices, setVoices] = useState<Array<{ voice_id: string; name: string; category: string }>>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [customGreeting, setCustomGreeting] = useState('');
  const [customClosing, setCustomClosing] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch voice agent details
  const { data: voiceAgentData, isLoading: isLoadingAgent } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/elevenlabs-agent`],
    enabled: !!tenantId && !!restaurantId,
  });

  // Load voices on component mount
  useEffect(() => {
    const loadVoices = async () => {
      setIsLoadingVoices(true);
      try {
        const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/elevenlabs-voices`);
        if (response.ok) {
          const data = await response.json();
          setVoices(data.voices || []);
        }
      } catch (error) {
        console.error('Failed to load voices:', error);
      } finally {
        setIsLoadingVoices(false);
      }
    };
    loadVoices();
  }, [tenantId, restaurantId]);

  // Set form values when agent data loads
  useEffect(() => {
    if (voiceAgentData?.voiceAgent) {
      setSelectedVoice(voiceAgentData.voiceAgent.elevenlabsVoiceId || '');
      setCustomGreeting(voiceAgentData.voiceAgent.restaurantGreeting || '');
      setCustomClosing(voiceAgentData.voiceAgent.restaurantClosingMessage || '');
    }
  }, [voiceAgentData]);

  const handleCreateOrUpdate = async () => {
    if (!selectedVoice) {
      toast({
        title: "Voice Required",
        description: "Please select a voice for your AI agent",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        voiceId: selectedVoice,
        language: 'en',
        customGreeting: customGreeting || undefined,
        customClosingMessage: customClosing || undefined
      };

      const response = await apiRequest(`/api/tenants/${tenantId}/restaurants/${restaurantId}/elevenlabs-agent`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response.success) {
        toast({
          title: "ElevenLabs Agent Configured",
          description: "Your AI voice agent has been successfully configured with ElevenLabs"
        });
        queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/elevenlabs-agent`] });
      }
    } catch (error: any) {
      toast({
        title: "Configuration Failed",
        description: error.message || "Failed to configure ElevenLabs agent",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoadingAgent) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            ElevenLabs Voice Configuration
          </CardTitle>
          <CardDescription>
            Configure your AI voice agent with ElevenLabs for natural-sounding conversations. 
            This provides a more advanced alternative to the standard Synthflow integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Voice Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Select Voice</label>
            {isLoadingVoices ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                Loading available voices...
              </div>
            ) : (
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an AI voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.voice_id} value={voice.voice_id}>
                      {voice.name} ({voice.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              Choose a voice that matches your restaurant's personality and target audience.
            </p>
          </div>

          {/* Custom Greeting */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Custom Greeting (Optional)</label>
            <Textarea
              placeholder="Thank you for calling [Restaurant Name], this is the reservations assistant. How may I help you today?"
              value={customGreeting}
              onChange={(e) => setCustomGreeting(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the default greeting template. Use [Restaurant Name] as a placeholder.
            </p>
          </div>

          {/* Custom Closing */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Custom Closing Message (Optional)</label>
            <Textarea
              placeholder="Thank you for calling [Restaurant Name]. We look forward to serving you!"
              value={customClosing}
              onChange={(e) => setCustomClosing(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the default closing message template.
            </p>
          </div>

          {/* Action Button */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleCreateOrUpdate}
              disabled={isCreating || !selectedVoice}
              className="flex-1"
            >
              {isCreating ? 'Configuring...' : 
               voiceAgentData?.voiceAgent?.elevenlabsAgentId ? 'Update ElevenLabs Agent' : 'Create ElevenLabs Agent'}
            </Button>
          </div>

          {/* Current Status */}
          {voiceAgentData?.voiceAgent && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h4 className="font-medium mb-2">Current Configuration</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider:</span>
                  <span>{voiceAgentData.voiceAgent.provider || 'synthflow'}</span>
                </div>
                {voiceAgentData.voiceAgent.elevenlabsAgentId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ElevenLabs Agent ID:</span>
                    <span className="font-mono text-xs">{voiceAgentData.voiceAgent.elevenlabsAgentId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={voiceAgentData.voiceAgent.isActive ? 'text-green-600' : 'text-orange-600'}>
                    {voiceAgentData.voiceAgent.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Information Box */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">About ElevenLabs Integration</h4>
                <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                  <li>• Natural, human-like voice conversations</li>
                  <li>• Advanced speech recognition and response</li>
                  <li>• Automatic reservation booking from voice calls</li>
                  <li>• 24/7 customer support availability</li>
                  <li>• Customizable greeting and closing messages</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}