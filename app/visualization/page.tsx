"use client"

import type React from "react"

import { useState, useMemo, useCallback, useRef } from "react"
import { useData } from "@/lib/data-context"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, Shield, RotateCcw } from "lucide-react"
import Link from "next/link"

interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
}

interface Application {
  id: string
  name: string
  description: string
  users: User[]
  reminderFrequency?: string
  nextReminderDate?: number
  notificationEmails?: string[]
}

interface VisualizationNode {
  id: string
  name: string
  type: "app" | "user"
  x: number
  y: number
  isAdmin?: boolean
  appCount?: number
}

interface Connection {
  from: string
  to: string
  isAdmin: boolean
}

interface DragState {
  isDragging: boolean
  draggedNodeId: string | null
  dragOffset: { x: number; y: number }
}

export default function DataVisualization() {
  const { applications } = useData()
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedNodeId: null,
    dragOffset: { x: 0, y: 0 },
  })
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  const svgRef = useRef<SVGSVGElement>(null)

  // Process data to create visualization nodes and connections
  const { initialNodes, connections, uniqueUsers } = useMemo(() => {
    const uniqueUsersMap = new Map<string, User & { appCount: number }>()

    // Collect all unique users and count their app access
    applications.forEach((app) => {
      app.users.forEach((user) => {
        if (uniqueUsersMap.has(user.email)) {
          const existingUser = uniqueUsersMap.get(user.email)!
          uniqueUsersMap.set(user.email, {
            ...existingUser,
            appCount: existingUser.appCount + 1,
          })
        } else {
          uniqueUsersMap.set(user.email, {
            ...user,
            appCount: 1,
          })
        }
      })
    })

    const uniqueUsers = Array.from(uniqueUsersMap.values())

    // Create nodes for applications (positioned in a circle around the center)
    const appNodes: VisualizationNode[] = applications.map((app, index) => {
      const angle = (index / applications.length) * 2 * Math.PI
      const radius = 250
      return {
        id: app.id,
        name: app.name,
        type: "app" as const,
        x: 400 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius,
      }
    })

    // Create nodes for unique users (positioned in an inner circle)
    const userNodes: VisualizationNode[] = uniqueUsers.map((user, index) => {
      const angle = (index / uniqueUsers.length) * 2 * Math.PI
      const radius = 120
      return {
        id: user.email,
        name: user.name,
        type: "user" as const,
        x: 400 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius,
        appCount: user.appCount,
      }
    })

    // Create connections from each app to users that have access to that app
    const connections: Connection[] = []
    applications.forEach((app) => {
      app.users.forEach((user) => {
        connections.push({
          from: app.id,
          to: user.email,
          isAdmin: user.isAdmin,
        })
      })
    })

    return {
      initialNodes: [...appNodes, ...userNodes],
      connections,
      uniqueUsers,
    }
  }, [applications])

  // Get current node positions (either custom or initial)
  const nodes = useMemo(() => {
    return initialNodes.map((node) => {
      const customPosition = nodePositions.get(node.id)
      return customPosition ? { ...node, ...customPosition } : node
    })
  }, [initialNodes, nodePositions])

  const getNodeById = (id: string) => nodes.find((node) => node.id === id)

  // Get SVG coordinates from mouse event
  const getSVGCoordinates = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 }

    const rect = svgRef.current.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }, [])

  // Handle mouse down on node (start dragging)
  const handleMouseDown = useCallback(
    (event: React.MouseEvent, nodeId: string) => {
      event.preventDefault()
      event.stopPropagation()

      const node = getNodeById(nodeId)
      if (!node) return

      const svgCoords = getSVGCoordinates(event)

      setDragState({
        isDragging: true,
        draggedNodeId: nodeId,
        dragOffset: {
          x: svgCoords.x - node.x,
          y: svgCoords.y - node.y,
        },
      })
    },
    [getSVGCoordinates],
  )

  // Handle mouse move (dragging)
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!dragState.isDragging || !dragState.draggedNodeId) return

      const svgCoords = getSVGCoordinates(event)
      const newPosition = {
        x: Math.max(30, Math.min(770, svgCoords.x - dragState.dragOffset.x)), // Keep within bounds
        y: Math.max(30, Math.min(570, svgCoords.y - dragState.dragOffset.y)),
      }

      setNodePositions((prev) => new Map(prev).set(dragState.draggedNodeId!, newPosition))
    },
    [dragState, getSVGCoordinates],
  )

  // Handle mouse up (stop dragging)
  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedNodeId: null,
      dragOffset: { x: 0, y: 0 },
    })
  }, [])

  // Handle node click (for selection)
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (!dragState.isDragging) {
        setSelectedNode(selectedNode === nodeId ? null : nodeId)
      }
    },
    [selectedNode, dragState],
  )

  // Reset to original positions
  const resetPositions = useCallback(() => {
    setNodePositions(new Map())
    setSelectedNode(null)
  }, [])

  // Calculate arrow head position and rotation
  const calculateArrowHead = useCallback((fromNode: VisualizationNode, toNode: VisualizationNode) => {
    const dx = toNode.x - fromNode.x
    const dy = toNode.y - fromNode.y
    const length = Math.sqrt(dx * dx + dy * dy)

    if (length === 0) return { x: toNode.x, y: toNode.y, angle: 0 }

    // Calculate the point on the edge of the target node circle
    const nodeRadius = toNode.type === "app" ? 30 : 20
    const ratio = (length - nodeRadius) / length
    const edgeX = fromNode.x + dx * ratio
    const edgeY = fromNode.y + dy * ratio

    // Calculate angle for arrow rotation
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)

    return { x: edgeX, y: edgeY, angle }
  }, [])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Access Visualization</h1>
                <p className="text-gray-600 mt-2">Interactive view of application access relationships</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={resetPositions}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Layout
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Visualization */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Access Network</CardTitle>
                  <p className="text-sm text-gray-600">Click and drag nodes to rearrange the layout</p>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <svg
                      ref={svgRef}
                      width="800"
                      height="600"
                      className="border rounded-lg bg-gray-50 select-none"
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      style={{ cursor: dragState.isDragging ? "grabbing" : "default" }}
                    >
                      {/* Connections */}
                      {connections.map((connection, index) => {
                        const fromNode = getNodeById(connection.from)
                        const toNode = getNodeById(connection.to)
                        if (!fromNode || !toNode) return null

                        const arrowHead = calculateArrowHead(fromNode, toNode)

                        return (
                          <g key={index}>
                            {/* Connection line */}
                            <line
                              x1={fromNode.x}
                              y1={fromNode.y}
                              x2={arrowHead.x}
                              y2={arrowHead.y}
                              stroke={connection.isAdmin ? "#ef4444" : "#6b7280"}
                              strokeWidth={connection.isAdmin ? "2" : "1"}
                              strokeDasharray={connection.isAdmin ? "none" : "5,5"}
                              opacity="0.6"
                            />
                            {/* Arrow head */}
                            <polygon
                              points="0,-4 8,0 0,4"
                              fill={connection.isAdmin ? "#ef4444" : "#6b7280"}
                              opacity="0.6"
                              transform={`translate(${arrowHead.x}, ${arrowHead.y}) rotate(${arrowHead.angle})`}
                            />
                          </g>
                        )
                      })}

                      {/* Nodes */}
                      {nodes.map((node) => {
                        const isBeingDragged = dragState.draggedNodeId === node.id
                        const isSelected = selectedNode === node.id

                        return (
                          <g
                            key={node.id}
                            onMouseDown={(e) => handleMouseDown(e, node.id)}
                            onClick={() => handleNodeClick(node.id)}
                            style={{
                              cursor: isBeingDragged ? "grabbing" : "grab",
                              filter: isBeingDragged ? "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" : "none",
                            }}
                            className="transition-all duration-200"
                          >
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={node.type === "app" ? 30 : 20}
                              fill={
                                node.type === "app"
                                  ? isSelected
                                    ? "#3b82f6"
                                    : isBeingDragged
                                      ? "#1d4ed8"
                                      : "#60a5fa"
                                  : isSelected
                                    ? "#10b981"
                                    : isBeingDragged
                                      ? "#047857"
                                      : "#34d399"
                              }
                              stroke={isSelected || isBeingDragged ? "#1f2937" : "#ffffff"}
                              strokeWidth={isBeingDragged ? "3" : "2"}
                              className="transition-all duration-200"
                            />
                            <text
                              x={node.x}
                              y={node.y + 5}
                              textAnchor="middle"
                              className="text-xs font-medium fill-white pointer-events-none"
                            >
                              {node.type === "app" ? "APP" : "USER"}
                            </text>
                            <text
                              x={node.x}
                              y={node.y + (node.type === "app" ? 45 : 35)}
                              textAnchor="middle"
                              className="text-sm font-medium fill-gray-700 pointer-events-none"
                            >
                              {node.name.length > 12 ? `${node.name.substring(0, 12)}...` : node.name}
                            </text>
                            {node.type === "user" && node.appCount && node.appCount > 1 && (
                              <>
                                <circle
                                  cx={node.x + 15}
                                  cy={node.y - 15}
                                  r="10"
                                  fill="#f59e0b"
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                />
                                <text
                                  x={node.x + 15}
                                  y={node.y - 10}
                                  textAnchor="middle"
                                  className="text-xs font-bold fill-white pointer-events-none"
                                >
                                  {node.appCount}
                                </text>
                              </>
                            )}
                          </g>
                        )
                      })}
                    </svg>

                    {/* Legend */}
                    <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg border">
                      <h3 className="font-semibold mb-3">Legend</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-400 border-2 border-white"></div>
                          <span>Application</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-green-400 border-2 border-white"></div>
                          <span>User</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-0.5 bg-red-500"></div>
                          <span>Admin Access</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-0.5 bg-gray-500 border-dashed border-t"></div>
                          <span>Regular Access</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-yellow-500 text-white text-xs flex items-center justify-center font-bold">
                            N
                          </div>
                          <span>Multi-app User</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t text-xs text-gray-500">💡 Drag nodes to rearrange</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              {/* Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Applications</span>
                    <Badge variant="secondary">{applications.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Users</span>
                    <Badge variant="secondary">{uniqueUsers.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Connections</span>
                    <Badge variant="secondary">{connections.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Admin Connections</span>
                    <Badge variant="destructive">{connections.filter((c) => c.isAdmin).length}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Selected Node Details */}
              {selectedNode && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Node Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const node = getNodeById(selectedNode)
                      if (!node) return null

                      if (node.type === "app") {
                        const app = applications.find((a) => a.id === node.id)
                        return (
                          <div className="space-y-3">
                            <div>
                              <h3 className="font-semibold">{app?.name}</h3>
                              <p className="text-sm text-gray-600">{app?.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span className="text-sm">{app?.users.length} users</span>
                            </div>
                            <div className="space-y-1">
                              {app?.users.map((user) => (
                                <div key={user.id} className="flex items-center justify-between text-sm">
                                  <span>{user.name}</span>
                                  {user.isAdmin && <Shield className="w-3 h-3 text-red-500" />}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      } else {
                        const user = uniqueUsers.find((u) => u.email === node.id)
                        const userAppsByEmail = applications.filter((app) => app.users.some((u) => u.email === node.id))

                        return (
                          <div className="space-y-3">
                            <div>
                              <h3 className="font-semibold">{user?.name}</h3>
                              <p className="text-sm text-gray-600">{user?.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span className="text-sm">{userAppsByEmail.length} applications</span>
                            </div>
                            <div className="space-y-1">
                              {userAppsByEmail.map((app) => {
                                const userInApp = app.users.find((u) => u.email === user?.email)
                                return (
                                  <div key={app.id} className="flex items-center justify-between text-sm">
                                    <span>{app.name}</span>
                                    {userInApp?.isAdmin && <Shield className="w-3 h-3 text-red-500" />}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      }
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How to Use</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2">
                  <p>
                    • <strong>Drag</strong> nodes to rearrange layout
                  </p>
                  <p>
                    • <strong>Click</strong> nodes to see details
                  </p>
                  <p>• Blue circles represent applications</p>
                  <p>• Green circles represent users</p>
                  <p>• Red lines show admin access</p>
                  <p>• Dashed lines show regular access</p>
                  <p>• Yellow badges show multi-app users</p>
                  <p>• Use "Reset Layout" to restore original positions</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
