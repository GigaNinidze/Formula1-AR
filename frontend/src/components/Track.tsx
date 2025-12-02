import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

interface TrackProps {
  trackPath: number[][]
}

export default function Track({ trackPath }: TrackProps) {
  const { centerPoints, innerPoints, outerPoints } = useMemo(() => {
    if (!trackPath || trackPath.length < 2) {
      console.warn('⚠️ Track: Invalid track path data')
      return { centerPoints: [], innerPoints: [], outerPoints: [] }
    }

    // Convert to Vector3 points and filter out invalid values
    // Track is flat (Y=0) for horizontal surface viewing
    const points: THREE.Vector3[] = []
    for (const point of trackPath) {
      if (Array.isArray(point) && point.length >= 3) {
        const [x, , z] = point // Y is ignored - track is flattened to Y=0
        // Check for valid numbers
        if (typeof x === 'number' && typeof z === 'number' &&
            !isNaN(x) && !isNaN(z) &&
            isFinite(x) && isFinite(z)) {
          // Flatten track to Y=0 (horizontal surface)
          points.push(new THREE.Vector3(x, 0, z))
        }
      }
    }

    if (points.length < 2) {
      console.warn('⚠️ Track: Not enough valid points', { total: trackPath.length, valid: points.length })
      return { centerPoints: [], innerPoints: [], outerPoints: [] }
    }

    console.log('✅ Track: Processing', points.length, 'valid points')
    
    // Calculate track width (normalized units - scale for AR viewing)
    // Increased width for asphalt illusion (0.08 = 8cm approx in normalized space)
    const trackWidth = 0.08
    
    // Build inner and outer boundaries
    const innerPoints: THREE.Vector3[] = []
    const outerPoints: THREE.Vector3[] = []
    
    for (let i = 0; i < points.length; i++) {
      const curr = points[i]
      const prev = points[i > 0 ? i - 1 : points.length - 1]
      const next = points[i < points.length - 1 ? i + 1 : 0]
      
      // Calculate direction vectors
      const dir1 = new THREE.Vector3().subVectors(curr, prev)
      const dir2 = new THREE.Vector3().subVectors(next, curr)
      
      // Check for zero-length vectors (duplicate points)
      const dir1Len = dir1.length()
      const dir2Len = dir2.length()
      
      if (dir1Len < 0.0001 || dir2Len < 0.0001) {
        // Duplicate point or very close points - use previous normal or default
        if (innerPoints.length > 0) {
          // Reuse previous normal
          const prevNormal = new THREE.Vector3()
            .subVectors(outerPoints[outerPoints.length - 1], innerPoints[innerPoints.length - 1])
            .normalize()
          innerPoints.push(new THREE.Vector3().copy(curr).addScaledVector(prevNormal, -trackWidth / 2))
          outerPoints.push(new THREE.Vector3().copy(curr).addScaledVector(prevNormal, trackWidth / 2))
        } else {
          // First point with no previous - use default direction
          const defaultNormal = new THREE.Vector3(1, 0, 0)
          innerPoints.push(new THREE.Vector3().copy(curr).addScaledVector(defaultNormal, -trackWidth / 2))
          outerPoints.push(new THREE.Vector3().copy(curr).addScaledVector(defaultNormal, trackWidth / 2))
        }
        continue
      }
      
      // Normalize direction vectors
      dir1.normalize()
      dir2.normalize()
      
      // Average direction for smoother curves
      const avgDir = new THREE.Vector3().addVectors(dir1, dir2)
      const avgDirLen = avgDir.length()
      
      if (avgDirLen < 0.0001) {
        // Directions are opposite - use perpendicular to dir1
        const normal = new THREE.Vector3(-dir1.z, 0, dir1.x)
        if (normal.length() < 0.0001) {
          normal.set(1, 0, 0) // Fallback
        } else {
          normal.normalize()
        }
        innerPoints.push(new THREE.Vector3().copy(curr).addScaledVector(normal, -trackWidth / 2))
        outerPoints.push(new THREE.Vector3().copy(curr).addScaledVector(normal, trackWidth / 2))
        continue
      }
      
      avgDir.normalize()
      
      // Calculate perpendicular (normal) vector for track width
      // In 2D (X-Z plane), perpendicular is (-dir.z, 0, dir.x)
      const normal = new THREE.Vector3(-avgDir.z, 0, avgDir.x)
      const normalLen = normal.length()
      
      if (normalLen < 0.0001) {
        // Normal is zero - use fallback
        normal.set(1, 0, 0)
      } else {
        normal.normalize()
      }
      
      // Validate before adding
      const innerPoint = new THREE.Vector3().copy(curr).addScaledVector(normal, -trackWidth / 2)
      const outerPoint = new THREE.Vector3().copy(curr).addScaledVector(normal, trackWidth / 2)
      
      // Check for NaN values
      if (isNaN(innerPoint.x) || isNaN(innerPoint.y) || isNaN(innerPoint.z) ||
          isNaN(outerPoint.x) || isNaN(outerPoint.y) || isNaN(outerPoint.z)) {
        console.warn('⚠️ Track: NaN detected at point', i, { curr, normal, trackWidth })
        // Use center point as fallback
        innerPoints.push(curr.clone())
        outerPoints.push(curr.clone())
      } else {
        innerPoints.push(innerPoint)
        outerPoints.push(outerPoint)
      }
    }
    
    console.log('✅ Track: Generated', {
      center: points.length,
      inner: innerPoints.length,
      outer: outerPoints.length
    })
    
    return {
      centerPoints: points,
      innerPoints,
      outerPoints
    }
  }, [trackPath])

  if (centerPoints.length === 0) {
    console.warn('⚠️ Track: No points to render')
    return null
  }

  // Validate all points before rendering
  const validCenterPoints = centerPoints.filter(p => 
    !isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z) &&
    isFinite(p.x) && isFinite(p.y) && isFinite(p.z)
  )
  
  const validInnerPoints = innerPoints.filter(p => 
    !isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z) &&
    isFinite(p.x) && isFinite(p.y) && isFinite(p.z)
  )
  
  const validOuterPoints = outerPoints.filter(p => 
    !isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z) &&
    isFinite(p.x) && isFinite(p.y) && isFinite(p.z)
  )

  if (validCenterPoints.length < 2) {
    console.error('❌ Track: Not enough valid center points to render', {
      total: centerPoints.length,
      valid: validCenterPoints.length
    })
    return null
  }

  console.log('🎨 Track: Rendering with', {
    center: validCenterPoints.length,
    inner: validInnerPoints.length,
    outer: validOuterPoints.length
  })

  const asphaltGeometry = useMemo(() => {
    if (validInnerPoints.length < 2 || validOuterPoints.length < 2) return null
    
    const geo = new THREE.BufferGeometry()
    const vertices: number[] = []
    const indices: number[] = []
    
    // Create vertices [Inner0, Outer0, Inner1, Outer1, ...]
    validInnerPoints.forEach((inner, i) => {
      const outer = validOuterPoints[i]
      vertices.push(inner.x, inner.y, inner.z)
      vertices.push(outer.x, outer.y, outer.z)
    })
    
    // Create faces (quads as 2 triangles)
    for (let i = 0; i < validInnerPoints.length - 1; i++) {
      const base = i * 2
      // Triangle 1: Inner[i] -> Outer[i] -> Inner[i+1]
      indices.push(base, base + 1, base + 2)
      // Triangle 2: Outer[i] -> Outer[i+1] -> Inner[i+1]
      indices.push(base + 1, base + 3, base + 2)
    }
    
    // Close loop if start/end are close
    const first = validInnerPoints[0]
    const last = validInnerPoints[validInnerPoints.length - 1]
    if (first.distanceTo(last) < 0.1) {
      const base = (validInnerPoints.length - 1) * 2
      // Connect last to first
      indices.push(base, base + 1, 0)
      indices.push(base + 1, 1, 0)
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [validInnerPoints, validOuterPoints])

  return (
    <group>
      {/* Asphalt Surface */}
      {asphaltGeometry && (
        <mesh geometry={asphaltGeometry} receiveShadow>
          <meshStandardMaterial 
            color="#333333" 
            roughness={0.9} 
            metalness={0.1} 
            side={THREE.DoubleSide} 
          />
        </mesh>
      )}

      {/* Outer track boundary (White line) */}
      {validOuterPoints.length > 1 && (
        <Line
          points={validOuterPoints}
          color="#FFFFFF"
          lineWidth={2}
          segments={false}
          transparent={false}
          opacity={0.8}
        />
      )}
      
      {/* Inner track boundary (White line) */}
      {validInnerPoints.length > 1 && (
        <Line
          points={validInnerPoints}
          color="#FFFFFF"
          lineWidth={2}
          segments={false}
          transparent={false}
          opacity={0.8}
        />
      )}
    </group>
  )
}

