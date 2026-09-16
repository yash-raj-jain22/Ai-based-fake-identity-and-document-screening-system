import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Filter, ArrowRight, Search, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { screeningApi } from "@/services/api/screeningApi"

export function ScreeningHistory() {
  const [searchTerm, setSearchTerm] = useState("")
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
        console.error("Failed to fetch screenings", error);
      } finally {
        setLoading(false);
      }
    };
    fetchScreenings();
  }, []);

  const RiskBadge = ({ risk }) => {
    switch (risk) {
      case 'HIGH': return <Badge variant="destructive">High Risk</Badge>
      case 'MEDIUM': return <Badge variant="warning" className="bg-amber-500 text-white">Medium Risk</Badge>
      case 'LOW': return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Low Risk</Badge>
      case 'REVIEW_REQUIRED': return <Badge variant="destructive">Review</Badge>
      default: return <Badge variant="secondary">Pending</Badge>
    }
  }

  const filteredScreenings = screenings.filter(s => 
    s.screeningId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.ocr?.fields?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Screening History</h1>
          <p className="text-slate-500">View and filter past document screenings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-4 border-b flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 rounded-t-lg">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by ID, Name..."
              className="pl-8 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <Select defaultValue="all">
              <SelectTrigger className="w-[130px] bg-white">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risks</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[130px] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="review">Review Required</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="bg-white">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Screening ID</TableHead>
              <TableHead>Date / Time</TableHead>
              <TableHead>Subject Name</TableHead>
              <TableHead>Document Type</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                    </TableCell>
                </TableRow>
            ) : filteredScreenings.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                        No screenings found.
                    </TableCell>
                </TableRow>
            ) : (
                filteredScreenings.map((screening) => (
                  <TableRow key={screening._id}>
                    <TableCell className="font-medium text-xs">{screening.screeningId}</TableCell>
                    <TableCell className="text-slate-500">{new Date(screening.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{screening.ocr?.fields?.name || '-'}</TableCell>
                    <TableCell className="capitalize">{screening.document?.documentType || 'Unknown'}</TableCell>
                    <TableCell><RiskBadge risk={screening.riskAssessment?.level} /></TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${
                        screening.status === 'PARTIAL_RESULT' ? 'text-amber-600' : 
                        screening.status === 'COMPLETED' ? 'text-green-600' : 'text-slate-600'
                      }`}>
                        {screening.status.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/screenings/${screening.screeningId}`}>
                          View <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>

        <div className="p-4 border-t flex justify-between items-center text-sm text-slate-500">
          <div>Showing {filteredScreenings.length} results</div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm">Next</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
