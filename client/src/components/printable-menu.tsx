import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Printer, Download, Eye, Palette, Layout, Star, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import MenuOrderingService from './menu-ordering-service';

interface PrintableMenuProps {
  restaurantId: number;
  tenantId: number;
}

interface MenuDesignTheme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    priceFont: string;
  };
  layout: 'classic' | 'modern' | 'elegant' | 'minimalist';
}

const designThemes: MenuDesignTheme[] = [
  {
    id: 'classic',
    name: 'Classic Elegance',
    description: 'Traditional restaurant menu with serif fonts and elegant styling',
    colors: {
      primary: '#2C3E50',
      secondary: '#34495E',
      accent: '#E74C3C',
      text: '#2C3E50',
      background: '#FFFFFF'
    },
    typography: {
      headingFont: 'Georgia, serif',
      bodyFont: 'Times New Roman, serif',
      priceFont: 'Georgia, serif'
    },
    layout: 'classic'
  },
  {
    id: 'modern',
    name: 'Modern Minimalist',
    description: 'Clean, contemporary design with sans-serif fonts',
    colors: {
      primary: '#1A202C',
      secondary: '#2D3748',
      accent: '#4299E1',
      text: '#1A202C',
      background: '#FFFFFF'
    },
    typography: {
      headingFont: 'Arial, sans-serif',
      bodyFont: 'Helvetica, sans-serif',
      priceFont: 'Arial, sans-serif'
    },
    layout: 'modern'
  },
  {
    id: 'elegant',
    name: 'Fine Dining',
    description: 'Sophisticated design for upscale restaurants',
    colors: {
      primary: '#1C1C1C',
      secondary: '#3A3A3A',
      accent: '#D4AF37',
      text: '#1C1C1C',
      background: '#FEFEFE'
    },
    typography: {
      headingFont: 'Playfair Display, serif',
      bodyFont: 'Lato, sans-serif',
      priceFont: 'Playfair Display, serif'
    },
    layout: 'elegant'
  },
  {
    id: 'rustic',
    name: 'Rustic Charm',
    description: 'Warm, homestyle design with earthy colors',
    colors: {
      primary: '#8B4513',
      secondary: '#A0522D',
      accent: '#CD853F',
      text: '#8B4513',
      background: '#FFF8DC'
    },
    typography: {
      headingFont: 'Merriweather, serif',
      bodyFont: 'Open Sans, sans-serif',
      priceFont: 'Merriweather, serif'
    },
    layout: 'classic'
  }
];

export default function PrintableMenu({ restaurantId, tenantId }: PrintableMenuProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>('classic');
  const [showPreview, setShowPreview] = useState(false);
  const [showOrderService, setShowOrderService] = useState(false);
  const [menuLayout, setMenuLayout] = useState<'single' | 'double' | 'trifold'>('double');

  const { data: restaurant } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}`],
    enabled: !!(tenantId && restaurantId),
  });

  const { data: menuCategories = [] } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-categories`],
    enabled: !!(tenantId && restaurantId),
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-items`],
    enabled: !!(tenantId && restaurantId),
  });

  const { data: activeTheme } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/seasonal-themes`],
    enabled: !!(tenantId && restaurantId),
    select: (data: any[]) => data.find(theme => theme.isActive)
  });

  const currentTheme = designThemes.find(theme => theme.id === selectedTheme) || designThemes[0];

  const categorizedItems = menuCategories.map((category: any) => ({
    ...category,
    items: menuItems.filter((item: any) => item.categoryId === category.id)
  })).filter((category: any) => category.items.length > 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHTML());
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const handleDownloadPDF = () => {
    // Create a temporary window for PDF generation
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHTML());
      printWindow.document.close();
      printWindow.focus();
      
      // Use browser's print to PDF functionality
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const generatePrintHTML = () => {
    const seasonalBanner = activeTheme ? `
      <div style="
        background: linear-gradient(135deg, ${activeTheme.color}20, ${activeTheme.color}10);
        border: 2px solid ${activeTheme.color};
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 24px;
        text-align: center;
      ">
        <h3 style="
          color: ${activeTheme.color};
          margin: 0 0 8px 0;
          font-family: ${currentTheme.typography.headingFont};
          font-size: 18px;
          font-weight: bold;
        ">${activeTheme.name}</h3>
        <p style="
          color: ${currentTheme.colors.text};
          margin: 0;
          font-style: italic;
          font-size: 14px;
        ">${activeTheme.marketingCopy}</p>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${restaurant?.name} - Menu</title>
        <style>
          @page {
            margin: 0.5in;
            size: ${menuLayout === 'single' ? 'A4 portrait' : menuLayout === 'double' ? 'A4 landscape' : 'A3 landscape'};
          }
          
          body {
            font-family: ${currentTheme.typography.bodyFont};
            color: ${currentTheme.colors.text};
            background-color: ${currentTheme.colors.background};
            margin: 0;
            padding: 20px;
            line-height: 1.6;
          }
          
          .menu-header {
            text-align: center;
            margin-bottom: 32px;
            border-bottom: 3px solid ${currentTheme.colors.accent};
            padding-bottom: 24px;
          }
          
          .restaurant-name {
            font-family: ${currentTheme.typography.headingFont};
            font-size: 36px;
            font-weight: bold;
            color: ${currentTheme.colors.primary};
            margin: 0 0 8px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          
          .restaurant-info {
            font-size: 14px;
            color: ${currentTheme.colors.secondary};
            margin: 8px 0;
          }
          
          .menu-content {
            columns: ${menuLayout === 'single' ? '1' : menuLayout === 'double' ? '2' : '3'};
            column-gap: 32px;
            column-rule: 1px solid ${currentTheme.colors.accent}30;
          }
          
          .category {
            break-inside: avoid;
            margin-bottom: 32px;
          }
          
          .category-title {
            font-family: ${currentTheme.typography.headingFont};
            font-size: 24px;
            font-weight: bold;
            color: ${currentTheme.colors.primary};
            margin: 0 0 16px 0;
            text-transform: uppercase;
            border-bottom: 2px solid ${currentTheme.colors.accent};
            padding-bottom: 8px;
            letter-spacing: 1px;
          }
          
          .menu-item {
            margin-bottom: 20px;
            break-inside: avoid;
          }
          
          .item-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 4px;
          }
          
          .item-name {
            font-weight: bold;
            font-size: 16px;
            color: ${currentTheme.colors.primary};
            flex: 1;
            padding-right: 8px;
          }
          
          .item-price {
            font-family: ${currentTheme.typography.priceFont};
            font-weight: bold;
            color: ${currentTheme.colors.accent};
            font-size: 16px;
            white-space: nowrap;
          }
          
          .price-dots {
            border-bottom: 1px dotted ${currentTheme.colors.secondary};
            flex: 1;
            height: 1px;
            margin: 0 8px 4px 8px;
          }
          
          .item-description {
            font-size: 13px;
            color: ${currentTheme.colors.secondary};
            font-style: italic;
            margin-bottom: 6px;
            line-height: 1.4;
          }
          
          .item-badges {
            margin-top: 6px;
          }
          
          .badge {
            display: inline-block;
            background-color: ${currentTheme.colors.accent}20;
            color: ${currentTheme.colors.accent};
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            margin-right: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .dietary-badge {
            background-color: #10B981;
            color: white;
          }
          
          .allergen-badge {
            background-color: #EF4444;
            color: white;
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: ${currentTheme.colors.secondary};
            border-top: 1px solid ${currentTheme.colors.accent}30;
            padding-top: 16px;
          }
          
          .print-date {
            font-size: 10px;
            color: ${currentTheme.colors.secondary};
            text-align: right;
            margin-top: 20px;
          }
          
          @media print {
            .no-print {
              display: none !important;
            }
            
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="menu-header">
          <h1 class="restaurant-name">${restaurant?.name || 'Restaurant Name'}</h1>
          ${restaurant?.address ? `<p class="restaurant-info">📍 ${restaurant.address}</p>` : ''}
          ${restaurant?.phone ? `<p class="restaurant-info">📞 ${restaurant.phone}</p>` : ''}
          ${restaurant?.cuisine ? `<p class="restaurant-info">🍽️ ${restaurant.cuisine} Cuisine</p>` : ''}
        </div>
        
        ${seasonalBanner}
        
        <div class="menu-content">
          ${categorizedItems.map((category: any) => `
            <div class="category">
              <h2 class="category-title">${category.name}</h2>
              ${category.items.map((item: any) => `
                <div class="menu-item">
                  <div class="item-header">
                    <span class="item-name">${item.name}</span>
                    <span class="price-dots"></span>
                    <span class="item-price">${formatPrice(item.price)}</span>
                  </div>
                  ${item.description ? `<p class="item-description">${item.description}</p>` : ''}
                  <div class="item-badges">
                    ${item.dietaryRestrictions?.map((diet: string) => 
                      `<span class="badge dietary-badge">${diet}</span>`
                    ).join('') || ''}
                    ${item.allergens?.map((allergen: string) => 
                      `<span class="badge allergen-badge">Contains ${allergen}</span>`
                    ).join('') || ''}
                    ${item.isPopular ? '<span class="badge">⭐ Popular</span>' : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
        
        <div class="footer">
          <p>Thank you for dining with us! For reservations, please contact us.</p>
          ${restaurant?.website ? `<p>Visit us online: ${restaurant.website}</p>` : ''}
        </div>
        
        <div class="print-date">
          Menu printed on ${format(new Date(), 'MMMM d, yyyy')}
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Printable Menu Designer
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create professional print-ready menus for your restaurant
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Menu Preview - {currentTheme.name}</DialogTitle>
              </DialogHeader>
              <div 
                className="border rounded-lg p-6 bg-white"
                dangerouslySetInnerHTML={{ __html: generatePrintHTML().replace(/<html>.*<body>/, '').replace(/<\/body>.*<\/html>/, '') }}
              />
            </DialogContent>
          </Dialog>
          
          <Button onClick={handlePrint} size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          
          <Button onClick={handleDownloadPDF} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Save as PDF
          </Button>
          
          <Dialog open={showOrderService} onOpenChange={setShowOrderService}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Order Printed Menus
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Professional Menu Printing Service</DialogTitle>
              </DialogHeader>
              <MenuOrderingService
                restaurantId={restaurantId}
                tenantId={tenantId}
                selectedTheme={selectedTheme}
                menuLayout={menuLayout}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Design Theme Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Design Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedTheme} onValueChange={setSelectedTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {designThemes.map((theme) => (
                  <SelectItem key={theme.id} value={theme.id}>
                    {theme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentTheme.description}
              </p>
              
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: currentTheme.colors.primary }}
                />
                <div 
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: currentTheme.colors.accent }}
                />
                <span className="text-xs text-gray-500">Color scheme</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layout Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              Layout Style
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={menuLayout} onValueChange={(value: any) => setMenuLayout(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Column</SelectItem>
                <SelectItem value="double">Double Column</SelectItem>
                <SelectItem value="trifold">Tri-fold Brochure</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {menuLayout === 'single' && 'Classic single-column layout, perfect for simple menus'}
              {menuLayout === 'double' && 'Two-column layout for standard restaurant menus'}
              {menuLayout === 'trifold' && 'Three-column layout for comprehensive menus'}
            </div>
          </CardContent>
        </Card>

        {/* Menu Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Menu Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Categories:</span>
              <Badge variant="secondary">{categorizedItems.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Items:</span>
              <Badge variant="secondary">{menuItems.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Popular Items:</span>
              <Badge variant="secondary">
                {menuItems.filter((item: any) => item.isPopular).length}
              </Badge>
            </div>
            {activeTheme && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Seasonal Theme:</span>
                  <Badge 
                    style={{ 
                      backgroundColor: `${activeTheme.color}20`,
                      color: activeTheme.color,
                      borderColor: activeTheme.color
                    }}
                    variant="outline"
                  >
                    {activeTheme.name}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Printing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">For Professional Printing:</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Use high-quality paper (24lb+ weight recommended)</li>
                <li>• Print in color for best results</li>
                <li>• Consider lamination for durability</li>
                <li>• Use professional printing services for bulk orders</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Menu Updates:</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Update prices in Menu Management</li>
                <li>• Add seasonal items for special occasions</li>
                <li>• Mark popular items to highlight them</li>
                <li>• Include allergen information for compliance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}