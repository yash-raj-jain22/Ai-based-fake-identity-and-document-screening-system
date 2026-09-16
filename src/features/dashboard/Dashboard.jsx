import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, CheckCircle2, Clock, FileScan, ShieldAlert, ArrowRight, Loader2 } from "lucide-react"
import { screeningApi } from "@/services/api/screeningApi"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

function getRiskBadge(risk) {
  switch (risk) {
    case 'HIGH': return <Badge variant="destructive">High Risk</Badge>
    case 'MEDIUM': return <Badge variant="warning" className="bg-amber-500 hover:bg-amber-600 text-white">Medium Risk</Badge>
    case 'LOW': return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Low Risk</Badge>
    default: return <Badge variant="secondary">Unknown</Badge>
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'COMPLETED': return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'PARTIAL_RESULT': return <AlertCircle className="h-4 w-4 text-amber-500" />
    case 'PROCESSING': return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
    default: return <Clock className="h-4 w-4 text-slate-500" />
  }
}

export function Dashboard() {
  const [screenings, setScreenings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchScreenings = async () => {
      try {
        const response = await screeningApi.getScreenings();
        if (response.success && Array.isArray(response.data)) {
          setScreenings(response.data);
        } else if (response.data?.success && Array.isArray(response.data.data)) {
          setScreenings(response.data.data);
        } else if (Array.isArray(response)) {
          setScreenings(response);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchScreenings();
  }, []);

  const totalScreenings = screenings.length;
  const highRisk = screenings.filter(s => s.riskAssessment?.level === 'HIGH').length;
  const reviewRequired = screenings.filter(s => s.status === 'PARTIAL_RESULT').length;
  const pending = screenings.filter(s => s.status === 'PROCESSING' || s.status === 'CREATED').length;
  
  const recentScreenings = screenings.slice(0, 5);
  
  // Generate some dynamic alerts based on high risk items
  const mockAlerts = screenings
      .filter(s => s.riskAssessment?.level === 'HIGH' || s.status === 'PARTIAL_RESULT')
      .slice(0, 3)
      .map(s => ({
          id: s._id,
          severity: s.riskAssessment?.level === 'HIGH' ? 'HIGH' : 'MEDIUM',
          message: `Screening ${s.screeningId} flagged as ${s.riskAssessment?.level} risk.`,
          timestamp: new Date(s.createdAt).toLocaleTimeString()
      }));

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Overview of today's screening activity and alerts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/screenings">View All</Link>
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" asChild>
            <Link to="/screenings/new">
              <FileScan className="mr-2 h-4 w-4" />
              New Screening
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Screenings</CardTitle>
            <FileScan className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScreenings.toLocaleString()}</div>
            <p className="text-xs text-slate-400">Total documents processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">Review Required</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{reviewRequired}</div>
            <p className="text-xs text-slate-400">Needs manual inspection</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">High Risk</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{highRisk}</div>
            <p className="text-xs text-slate-400">Escalated cases</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Processing</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending}</div>
            <p className="text-xs text-slate-400">Currently analyzing</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Recent Screenings Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Screenings</CardTitle>
            <CardDescription>Latest documents processed by the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentScreenings.map((screening) => (
                  <TableRow key={screening._id}>
                    <TableCell className="font-medium text-xs">{screening.screeningId}</TableCell>
                    <TableCell className="capitalize">{screening.document?.documentType}</TableCell>
                    <TableCell>{screening.ocr?.fields?.name || '-'}</TableCell>
                    <TableCell>{getRiskBadge(screening.riskAssessment?.level)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        {getStatusIcon(screening.status)}
                        <span className={cn(
                          screening.status === 'PARTIAL_RESULT' && 'text-amber-600 font-medium',
                          screening.status === 'PROCESSING' && 'text-blue-600'
                        )}>
                          {screening.status.replace('_', ' ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/screenings/${screening.screeningId}`}>
                          View <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {recentScreenings.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-500 h-24">No recent screenings.</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Critical Alerts</CardTitle>
            <CardDescription>System flags requiring review.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockAlerts.length > 0 ? mockAlerts.map(alert => (
                <div key={alert.id} className="flex items-start space-x-4 border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                  <div className={cn(
                    "mt-0.5 rounded-full p-1",
                    alert.severity === 'HIGH' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'
                  )}>
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.timestamp}</p>
                  </div>
                </div>
              )) : (
                 <p className="text-sm text-slate-500">No critical alerts.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
