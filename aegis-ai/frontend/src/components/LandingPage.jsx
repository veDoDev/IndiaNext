import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float, MeshDistortMaterial, Sphere, OrbitControls } from '@react-three/drei';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ShieldAlert, Fingerprint, Activity, Link2 } from 'lucide-react';

// A high-tech glowing, distorting energy core that responds to user interaction
const CyberCore = () => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[2.5, 1]} />
        <MeshDistortMaterial 
          color="#00d4ff" 
          attach="material" 
          distort={0.5} 
          speed={2} 
          roughness={0.1}
          wireframe={true}
        />
        {/* Inner solid glowing sphere */}
        <Sphere args={[1.8, 32, 32]}>
          <meshBasicMaterial color="#005577" transparent opacity={0.6} />
        </Sphere>
      </mesh>
    </Float>
  );
};

const FeatureCard = ({ icon: Icon, title, desc, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.6, delay }}
    whileHover={{ y: -5, boxShadow: '0 10px 30px -10px rgba(0,212,255,0.3)' }}
    style={{
      background: 'rgba(10, 10, 12, 0.7)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(0, 212, 255, 0.2)',
      borderRadius: '12px',
      padding: '32px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '16px',
      flex: '1',
      minWidth: '250px'
    }}
  >
    <div style={{ padding: '12px', background: 'rgba(0,212,255,0.1)', borderRadius: '8px', color: '#00d4ff' }}>
      <Icon size={24} />
    </div>
    <h3 style={{ fontFamily: 'Syne, sans-serif', color: '#fff', fontSize: '20px', margin: 0 }}>{title}</h3>
    <p style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8892b0', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{desc}</p>
  </motion.div>
);

import { useNavigate } from 'react-router-dom';

// ... (keep CyberCore and FeatureCard unchanged) ...

const LandingPage = () => {
  const { scrollYProgress } = useScroll();
  const navigate = useNavigate();
  
  // Parallax effects for the hero text
  const yText = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacityText = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  // Push the 3D canvas down slightly as we scroll
  const yCanvas = useTransform(scrollYProgress, [0, 1], [0, 150]);

  return (
    <div style={{ width: '100%', background: '#0a0a0c', color: '#fff', overflowX: 'hidden' }}>
      
      {/* 3D Background Canvas - Fixed to background but moves slightly with parallax */}
      <motion.div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0, y: yCanvas }}>
        <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
          <CyberCore />
          {/* OrbitControls allow the mouse to drag and rotate the core */}
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            autoRotate={false} 
            maxPolarAngle={Math.PI / 1.5} 
            minPolarAngle={Math.PI / 3}
          />
        </Canvas>
        
        {/* Helper text for 3D interaction */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 3, duration: 2 }}
          style={{
            position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#00d4ff', letterSpacing: '2px',
            pointerEvents: 'none'
          }}
        >
          [ CLICK & DRAG TO ROTATE CORE ]
        </motion.div>
      </motion.div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        
        {/* ─── HERO SECTION (100vh) ─── */}
        <section style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <motion.div style={{ textAlign: 'center', y: yText, opacity: opacityText }}>
            <motion.h1 
              style={{ 
                fontFamily: 'Syne, sans-serif', fontSize: 'clamp(60px, 8vw, 100px)', fontWeight: 800, margin: '0 0 10px 0',
                textShadow: '0 0 30px rgba(0, 212, 255, 0.6), 0 0 60px rgba(0, 212, 255, 0.4)', letterSpacing: '8px'
              }}
              animate={{ textShadow: ['0 0 30px rgba(0,212,255,0.6)', '0 0 60px rgba(0,212,255,0.9)', '0 0 30px rgba(0,212,255,0.6)'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              AEGIS<span style={{ color: '#00d4ff' }}>.AI</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 1 }}
              style={{
                fontFamily: 'JetBrains Mono, monospace', color: '#8892b0', fontSize: 'clamp(14px, 2vw, 18px)',
                maxWidth: '600px', margin: '0 auto 50px auto', lineHeight: '1.6', padding: '0 20px'
              }}
            >
              Advanced Intelligence. Unbreakable Defense.<br/>
              Scroll down to initialize core security protocols.
            </motion.p>

            <motion.button
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5, duration: 0.5, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(0, 212, 255, 0.6)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/dashboard')}
              style={{
                pointerEvents: 'auto', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
                color: '#00d4ff', border: '1px solid #00d4ff', padding: '18px 48px',
                fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 'bold',
                letterSpacing: '2px', cursor: 'pointer', borderRadius: '6px',
                textTransform: 'uppercase', boxShadow: '0 0 15px rgba(0, 212, 255, 0.2)',
              }}
            >
              Enter Dashboard →
            </motion.button>
          </motion.div>
        </section>


        {/* ─── FEATURES SECTION ─── */}
        <section style={{ 
          minHeight: '100vh', padding: '100px 20px', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(180deg, rgba(10,10,12,0) 0%, rgba(10,10,12,0.9) 30%, rgba(10,10,12,1) 100%)'
        }}>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: '80px', maxWidth: '800px' }}
          >
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '40px', color: '#fff', marginBottom: '20px' }}>
              Next-Gen Threat Intelligence
            </h2>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8892b0', fontSize: '15px', lineHeight: '1.8' }}>
              AEGIS.AI employs a hybrid architecture, fusing State-of-the-Art (SOTA) HuggingFace Neural Networks 
              with deterministic local Machine Learning models to provide unparalleled analysis speed and accuracy.
            </p>
          </motion.div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', maxWidth: '1100px', width: '100%' }}>
            <FeatureCard 
              delay={0.1} icon={ShieldAlert} title="Phishing Detection" 
              desc="Analyzes structural semantics of emails and messages. Combines a fine-tuned BERT model via HuggingFace with local Logistic Regression fallbacks."
            />
            <FeatureCard 
              delay={0.2} icon={Fingerprint} title="Prompt Injection" 
              desc="Secures LLM pipelines by detecting adversarial jailbreaks, roleplays, and parameter overrides using specialized DeBERTa-v3 NLP models."
            />
            <FeatureCard 
              delay={0.3} icon={Link2} title="Malicious URL Analysis" 
              desc="Dissects domains, subdomains, and URL structures in real-time to intercept malware distribution endpoints and sophisticated typo-squatting."
            />
            <FeatureCard 
              delay={0.4} icon={Activity} title="Behavioural Anomalies" 
              desc="Processes high-velocity access logs via deeply nested rule-engines to correlate impossible travel flags and unauthorized bulk data exports."
            />
          </div>

          <motion.button
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.05, background: 'var(--cyan)', color: '#000' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')}
            style={{
              marginTop: '80px', background: 'transparent', color: '#00d4ff', border: '1px solid #00d4ff',
              padding: '16px 40px', fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 'bold',
              letterSpacing: '2px', cursor: 'pointer', borderRadius: '4px', textTransform: 'uppercase', transition: 'all 0.3s'
            }}
          >
            Initialize Core Systems
          </motion.button>

        </section>

      </div>
    </div>
  );
};

export default LandingPage;
