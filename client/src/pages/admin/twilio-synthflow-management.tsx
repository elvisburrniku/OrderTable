import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Phone, Cable, Import, CheckCircle, XCircle, Loader2, Settings, ExternalLink, AlertCircle } from 'lucide-react';

interface TwilioNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  sipTrunk?: string;
}

interface SynthflowNumber {
  id: string;
  phone_number: string;
  friendly_name: string;
  status: string;
  termination_uri?: string;
}

export default function TwilioSynthflowManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedNumber, setSelectedNumber] = useState<TwilioNumber | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState({
    termination_uri: '',
    username: '',
    password: '',
    friendly_name: ''
  });

  // Test Synthflow connection
  const { data: connectionStatus, isLoading: isTestingConnection } = useQuery({
    queryKey: ['/api/synthflow/test-connection'],
  });

  // Get Twilio phone numbers
  const { data: twilioNumbers, isLoading: isLoadingTwilio, refetch: refetchTwilio } = useQuery({
    queryKey: ['/api/integration/twilio/numbers'],
    staleTime: 30000, // Cache for 30 seconds
  });

  // Get Twilio SIP trunks
  const { data: sipTrunks, isLoading: isLoadingSipTrunks } = useQuery({
    queryKey: ['/api/integration/twilio/sip-trunks'],
    staleTime: 60000, // Cache for 1 minute
  });

  // Get Synthflow imported numbers
  const { data: synthflowNumbers, isLoading: isLoadingSynthflow, refetch: refetchSynthflow } = useQuery({
    queryKey: ['/api/integration/synthflow/numbers'],
    enabled: !!connectionStatus?.success,
  });

  // Import number to Synthflow mutation
  const importNumberMutation = useMutation({
    mutationFn: async (data: {
      phone_number: string;
      termination_uri: string;
      username?: string;
      password?: string;
      friendly_name?: string;
    }) => {
      const response = await apiRequest('POST', '/api/integration/twilio/import-to-synthflow', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Phone number imported to Synthflow successfully',
      });
      setIsImportDialogOpen(false);
      setSelectedNumber(null);
      setImportData({ termination_uri: '', username: '', password: '', friendly_name: '' });
      refetchSynthflow();
    },
    onError: (error: any) => {
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import phone number to Synthflow',
        variant: 'destructive',
      });
    },
  });

  // Remove number from Synthflow mutation
  const removeNumberMutation = useMutation({
    mutationFn: async (numberId: string) => {
      const response = await apiRequest('DELETE', `/api/integration/synthflow/numbers/${numberId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Phone number removed from Synthflow successfully',
      });
      refetchSynthflow();
    },
    onError: (error: any) => {
      toast({
        title: 'Removal Failed',
        description: error.message || 'Failed to remove phone number from Synthflow',
        variant: 'destructive',
      });
    },
  });

  const handleImportNumber = (number: TwilioNumber) => {
    setSelectedNumber(number);
    setImportData({
      ...importData,
      friendly_name: number.friendlyName || number.phoneNumber
    });
    setIsImportDialogOpen(true);
  };

  const submitImport = () => {
    if (!selectedNumber) return;
    
    importNumberMutation.mutate({
      phone_number: selectedNumber.phoneNumber,
      termination_uri: importData.termination_uri,
      username: importData.username || undefined,
      password: importData.password || undefined,
      friendly_name: importData.friendly_name || selectedNumber.friendlyName
    });
  };

  const getNumberStatus = (phoneNumber: string): 'available' | 'imported' | 'error' => {
    if (!synthflowNumbers?.numbers) return 'available';
    
    const imported = synthflowNumbers.numbers.find(
      (num: SynthflowNumber) => num.phone_number === phoneNumber
    );
    
    if (imported) {
      return imported.status === 'active' ? 'imported' : 'error';
    }
    
    return 'available';
  };

  const getSynthflowNumber = (phoneNumber: string): SynthflowNumber | undefined => {
    return synthflowNumbers?.numbers?.find(
      (num: SynthflowNumber) => num.phone_number === phoneNumber
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Twilio-Synthflow Integration</h1>
        <p className="text-muted-foreground mt-2">
          Manage phone numbers for AI voice agents using Twilio SIP trunking with Synthflow
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Synthflow API:</span>
              {isTestingConnection ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : connectionStatus?.success ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  <XCircle className="h-3 w-3 mr-1" />
                  Disconnected
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>Twilio:</span>
              {isLoadingTwilio ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : twilioNumbers?.success ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Configured
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="numbers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="numbers">Phone Numbers</TabsTrigger>
          <TabsTrigger value="sip-trunks">SIP Trunks</TabsTrigger>
        </TabsList>

        <TabsContent value="numbers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Twilio Phone Numbers
              </CardTitle>
              <CardDescription>
                Manage your Twilio phone numbers and import them to Synthflow for AI voice agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTwilio ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading phone numbers...
                </div>
              ) : !twilioNumbers?.success ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Twilio is not properly configured. Please check your TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.
                  </AlertDescription>
                </Alert>
              ) : twilioNumbers.numbers?.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No phone numbers found in your Twilio account. 
                    <a 
                      href="https://console.twilio.com/us1/develop/phone-numbers/manage/search" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-1 text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Purchase numbers from Twilio
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Friendly Name</TableHead>
                      <TableHead>Capabilities</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {twilioNumbers.numbers?.map((number: TwilioNumber) => {
                      const status = getNumberStatus(number.phoneNumber);
                      const synthflowNum = getSynthflowNumber(number.phoneNumber);
                      
                      return (
                        <TableRow key={number.sid}>
                          <TableCell className="font-mono">{number.phoneNumber}</TableCell>
                          <TableCell>{number.friendlyName}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {number.capabilities.voice && (
                                <Badge variant="secondary" className="text-xs">Voice</Badge>
                              )}
                              {number.capabilities.sms && (
                                <Badge variant="secondary" className="text-xs">SMS</Badge>
                              )}
                              {number.capabilities.mms && (
                                <Badge variant="secondary" className="text-xs">MMS</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {status === 'imported' ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Imported
                              </Badge>
                            ) : status === 'error' ? (
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                <XCircle className="h-3 w-3 mr-1" />
                                Error
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                Available
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {status === 'imported' && synthflowNum ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeNumberMutation.mutate(synthflowNum.id)}
                                disabled={removeNumberMutation.isPending}
                              >
                                {removeNumberMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : null}
                                Remove
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleImportNumber(number)}
                                disabled={!connectionStatus?.success}
                              >
                                <Import className="h-3 w-3 mr-1" />
                                Import
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sip-trunks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cable className="h-5 w-5" />
                SIP Trunks
              </CardTitle>
              <CardDescription>
                View your Twilio SIP trunks for voice connectivity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSipTrunks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading SIP trunks...
                </div>
              ) : sipTrunks?.trunks?.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No SIP trunks found in your Twilio account.
                    <a 
                      href="https://console.twilio.com/us1/develop/sip-trunking/trunks" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-1 text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Create SIP trunks in Twilio
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Friendly Name</TableHead>
                      <TableHead>SID</TableHead>
                      <TableHead>Termination URI</TableHead>
                      <TableHead>Origination URI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sipTrunks?.trunks?.map((trunk: any) => (
                      <TableRow key={trunk.sid}>
                        <TableCell>{trunk.friendlyName}</TableCell>
                        <TableCell className="font-mono">{trunk.sid}</TableCell>
                        <TableCell className="font-mono text-xs">{trunk.terminationUri || 'Not set'}</TableCell>
                        <TableCell className="font-mono text-xs">{trunk.originationUri || 'Not set'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Phone Number to Synthflow</DialogTitle>
          </DialogHeader>
          
          {selectedNumber && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Phone Number</Label>
                <p className="text-sm text-muted-foreground font-mono">{selectedNumber.phoneNumber}</p>
              </div>

              <div>
                <Label htmlFor="termination_uri">Termination URI *</Label>
                <Input
                  id="termination_uri"
                  value={importData.termination_uri}
                  onChange={(e) => setImportData({ ...importData, termination_uri: e.target.value })}
                  placeholder="sip:your-domain.com:5060"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  SIP URI where Synthflow should send calls for this number
                </p>
              </div>

              <div>
                <Label htmlFor="friendly_name">Friendly Name</Label>
                <Input
                  id="friendly_name"
                  value={importData.friendly_name}
                  onChange={(e) => setImportData({ ...importData, friendly_name: e.target.value })}
                  placeholder="My Restaurant Line"
                />
              </div>

              <div>
                <Label htmlFor="username">SIP Username (Optional)</Label>
                <Input
                  id="username"
                  value={importData.username}
                  onChange={(e) => setImportData({ ...importData, username: e.target.value })}
                  placeholder="sip_username"
                />
              </div>

              <div>
                <Label htmlFor="password">SIP Password (Optional)</Label>
                <Input
                  id="password"
                  type="password"
                  value={importData.password}
                  onChange={(e) => setImportData({ ...importData, password: e.target.value })}
                  placeholder="sip_password"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitImport}
              disabled={!importData.termination_uri || importNumberMutation.isPending}
            >
              {importNumberMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Import className="h-4 w-4 mr-2" />
              )}
              Import Number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}