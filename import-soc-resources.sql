-- SOC Resources Import - Complete List from Excel

-- =====================================================
-- IP CHECK RESOURCES (ip_check)
-- =====================================================
INSERT INTO soc_resources (category, name, url, description) VALUES
('ip_check', 'Virus Total', 'https://www.virustotal.com', 'Multi-engine antivirus and threat intelligence platform'),
('ip_check', 'Alien Vault OTX', 'https://otx.alienvault.com/browse/global/indicators', 'Open Threat Exchange - community threat intelligence'),
('ip_check', 'GreyNoise', 'https://viz.greynoise.io', 'Classify IPs scanning the internet - separates signal from noise'),
('ip_check', 'ThreatFox', 'https://threatfox.abuse.ch/browse/', 'IOC sharing platform for malware indicators'),
('ip_check', 'IP Quality Score', 'https://www.ipqualityscore.com/free-ip-lookup-proxy-vpn-test', 'Proxy, VPN, and bot detection for IPs'),
('ip_check', 'Pulsedive', 'https://pulsedive.com/', 'Community threat intelligence platform for IPs'),
('ip_check', 'Shodan', 'https://www.shodan.io/', 'Search engine for internet-connected devices'),
('ip_check', 'Censys', 'https://censys.io/ipv4', 'Internet-wide scan data and certificate transparency'),
('ip_check', 'Cisco Talos', 'https://talosintelligence.com/', 'Industry-leading IP and domain reputation intelligence'),
('ip_check', 'AbuseIPDB', 'https://www.abuseipdb.com/', 'IP reputation and abuse reporting database'),
('ip_check', 'WhatIsMyIPAddress Blacklist', 'https://whatismyipaddress.com/blacklist-check', 'Check if IP is blacklisted across multiple RBLs'),
('ip_check', 'Anti-Abuse Project', 'http://www.anti-abuse.org/multi-rbl-check/', 'Multi RBL blacklist checker'),
('ip_check', 'InQuest Labs', 'https://labs.inquest.net/repdb', 'Deep file inspection and IOC repositories'),
('ip_check', 'MalwareURL', 'https://www.malwareurl.com/listing-urls.php', 'Real-time malicious URL database'),
('ip_check', 'ThreatMiner', 'https://www.threatminer.org/', 'Passive DNS, WHOIS and malware sample intelligence'),
('ip_check', 'IPinfo', 'https://ipinfo.io/', 'Accurate IP geolocation, ASN, carrier and abuse data'),
('ip_check', 'BrowserLeaks', 'https://browserleaks.com', 'Browser fingerprinting and IP tools'),
('ip_check', 'VPN Proxy Detection', 'https://vpn-proxy-detection.ipify.org/', 'VPN and proxy detection API'),
('ip_check', 'IP Teoh', 'https://ip.teoh.io/', 'IP reputation and VPN detection tool'),
('ip_check', 'VPNAPI.io', 'https://vpnapi.io/', 'VPN detection API'),
('ip_check', 'IOC.One', 'https://ioc.one/', 'Search engine for indicators of compromise');

-- =====================================================
-- URL & DOMAIN CHECK RESOURCES (url_check)
-- =====================================================
INSERT INTO soc_resources (category, name, url, description) VALUES
('url_check', 'Virus Total', 'https://www.virustotal.com', 'Multi-engine URL scanner'),
('url_check', 'Alien Vault OTX', 'https://otx.alienvault.com/browse/global/indicators', 'URL reputation and threat data'),
('url_check', 'SecurityTrails', 'https://securitytrails.com/', 'Historical DNS, WHOIS, IP and subdomain intelligence'),
('url_check', 'URLHaus', 'https://urlhaus.abuse.ch/browse/', 'Malware distribution URL database and live feed'),
('url_check', 'URLScan.io', 'https://urlscan.io/', 'Sandbox-style URL scanner with screenshot and DOM analysis'),
('url_check', 'IP Quality Score URL', 'https://www.ipqualityscore.com/threat-feeds/malicious-url-scanner', 'URL reputation scoring for phishing and malware'),
('url_check', 'Sucuri SiteCheck', 'https://sitecheck.sucuri.net/', 'Remote website malware scanner and blocklist checker'),
('url_check', 'InQuest Labs IOCdb', 'https://labs.inquest.net/iocdb', 'IOC database for URLs'),
('url_check', 'ThreatFox', 'https://threatfox.abuse.ch/browse/', 'URL indicators for malware'),
('url_check', 'MalwareURL', 'https://www.malwareurl.com/listing-urls.php', 'Malicious URL list'),
('url_check', 'ThreatMiner', 'https://www.threatminer.org/', 'URL intelligence and passive DNS'),
('url_check', 'Pulsedive', 'https://pulsedive.com/', 'URL reputation and threat enrichment'),
('url_check', 'WhereGoes', 'https://wheregoes.com/', 'URL redirect tracer'),
('url_check', 'RedirectDetective', 'https://redirectdetective.com/', 'URL redirect analysis tool'),
('url_check', 'RedirectTracker', 'https://www.redirecttracker.com/', 'Track URL redirect chains'),
('url_check', 'BulkBlacklist', 'https://www.bulkblacklist.com/', 'Bulk blacklist check for domains'),
('url_check', 'DocGuard', 'https://app.docguard.io/', 'Document security and URL scanner'),
('url_check', 'IOC.One', 'https://ioc.one/', 'IOC search for URLs');

-- =====================================================
-- MALWARE ANALYSIS RESOURCES (malware_check)
-- =====================================================
INSERT INTO soc_resources (category, name, url, description) VALUES
('malware_check', 'Virus Total', 'https://www.virustotal.com', 'Multi-engine malware scanner'),
('malware_check', 'Alien Vault OTX', 'https://otx.alienvault.com/browse/global/indicators', 'Malware intelligence pulses'),
('malware_check', 'ThreatFox', 'https://threatfox.abuse.ch/browse/', 'Malware IOC sharing platform'),
('malware_check', 'Malware Bazaar', 'https://bazaar.abuse.ch/browse/', 'Malware sample sharing database'),
('malware_check', 'Hybrid Analysis', 'https://www.hybrid-analysis.com/', 'Free malware sandbox with Threat Score'),
('malware_check', 'Any.run', 'https://app.any.run/', 'Interactive malware sandbox with live task analysis'),
('malware_check', 'Joe Sandbox', 'https://www.joesandbox.com/#windows', 'Deep malware analysis with multiple OS support'),
('malware_check', 'Comodo Valkyrie', 'https://valkyrie.comodo.com', 'File analysis system'),
('malware_check', 'Browserling', 'https://www.browserling.com/', 'Cross-browser testing for malware'),
('malware_check', 'Cuckoo Sandbox Online', 'https://sandbox.pikker.ee/', 'Online Cuckoo sandbox'),
('malware_check', 'Triage', 'https://tria.ge/reports/public', 'Malware analysis platform'),
('malware_check', 'CAPE Sandbox', 'https://capesandbox.com/', 'Malware sandbox'),
('malware_check', 'Intezer', 'https://analyze.intezer.com/scan', 'Code DNA analysis for malware reuse detection'),
('malware_check', 'IRIS-H', 'https://iris-h.services/pages/dashboard', 'Digital forensics and malware analysis'),
('malware_check', 'Malshare', 'https://malshare.com/', 'Malware sample repository'),
('malware_check', 'YOMI', 'https://yomi.yoroi.company/upload', 'Malware analysis platform'),
('malware_check', 'InQuest Labs DFI', 'https://labs.inquest.net/dfi', 'Deep file inspection'),
('malware_check', 'Manalyzer', 'https://manalyzer.org/', 'Malware analyzer tool'),
('malware_check', 'ThreatMiner', 'https://www.threatminer.org/', 'Malware intelligence'),
('malware_check', 'Pulsedive', 'https://pulsedive.com/', 'Malware indicators'),
('malware_check', 'IObit Cloud', 'https://cloud.iobit.com/index.php', 'Cloud security scanning'),
('malware_check', 'DocGuard', 'https://app.docguard.io/', 'Document malware scanner'),
('malware_check', 'Sophos Intelix', 'https://intelix.sophos.com', 'Threat intelligence API for malware analysis');

-- =====================================================
-- CYBER THREAT INTELLIGENCE RESOURCES
-- =====================================================
INSERT INTO soc_resources (category, name, url, description) VALUES
('cyber_threat_intelligence', 'VulDB', 'https://vuldb.com/', 'Vulnerability database'),
('cyber_threat_intelligence', 'Alien Vault OTX', 'https://otx.alienvault.com/browse/global/indicators', 'Open Threat Exchange'),
('cyber_threat_intelligence', 'IBM X-Force Exchange', 'https://exchange.xforce.ibmcloud.com/', 'Threat intelligence exchange'),
('cyber_threat_intelligence', 'Feedly', 'https://feedly.com/', 'Threat intelligence feed reader'),
('cyber_threat_intelligence', 'Inoreader', 'https://www.inoreader.com/', 'RSS feed reader'),
('cyber_threat_intelligence', 'PulseDive Threats', 'https://pulsedive.com/explore/threats/', 'Threat feed'),
('cyber_threat_intelligence', 'PulseDive Ransomware', 'https://pulsedive.com/threat/Ransomware', 'Ransomware threat feed'),
('cyber_threat_intelligence', 'Ransomlook.io', 'https://www.ransomlook.io/', 'Ransomware tracking'),
('cyber_threat_intelligence', 'Ransomware Live', 'https://www.ransomware.live/', 'Live ransomware data'),
('cyber_threat_intelligence', 'HudsonRock', 'https://www.hudsonrock.com/threat-intelligence-cybercrime-tools', 'Cybercrime tools intelligence'),
('cyber_threat_intelligence', 'Malpedia', 'https://malpedia.caad.fkie.fraunhofer.de/', 'Malware reference library'),
('cyber_threat_intelligence', 'IntelX', 'https://intelx.io/tools?tab=general', 'OSINT search engine'),
('cyber_threat_intelligence', 'SANS ISC', 'https://isc.sans.edu/', 'Internet Storm Center'),
('cyber_threat_intelligence', 'SOCRadar Labs', 'https://socradar.io/labs', 'Threat intelligence lab'),
('cyber_threat_intelligence', 'ThreatFox', 'https://threatfox.abuse.ch/browse/', 'Malware IOC database'),
('cyber_threat_intelligence', 'ThreatMiner', 'https://www.threatminer.org/', 'Threat intelligence'),
('cyber_threat_intelligence', 'Malware Bazaar', 'https://bazaar.abuse.ch/browse/', 'Malware sample DB'),
('cyber_threat_intelligence', 'Virus Total', 'https://www.virustotal.com/gui/home/search', 'Comprehensive threat search'),
('cyber_threat_intelligence', 'Shodan', 'https://www.shodan.io/', 'Device search engine'),
('cyber_threat_intelligence', 'Censys', 'https://censys.io/ipv4', 'Asset discovery'),
('cyber_threat_intelligence', 'Any.run Trends', 'https://any.run/malware-trends/', 'Malware trends'),
('cyber_threat_intelligence', 'RiskIQ Community', 'https://community.riskiq.com/home', 'Threat intelligence community'),
('cyber_threat_intelligence', 'Mandiant', 'https://www.mandiant.com/advantage/threat-intelligence/free-version', 'Enterprise threat intelligence'),
('cyber_threat_intelligence', 'Carbon Black', 'https://community.carbonblack.com/', 'Endpoint security community'),
('cyber_threat_intelligence', 'CrowdStrike', 'https://www.crowdstrike.com/adversaries/', 'Adversary intelligence'),
('cyber_threat_intelligence', 'SecureWorks', 'https://www.secureworks.com/research/threat-profiles', 'Threat profiles'),
('cyber_threat_intelligence', 'Dragos', 'https://www.dragos.com/threat-groups/Lab52', 'Threat group intelligence'),
('cyber_threat_intelligence', 'Lab52', 'https://lab52.io/', 'Threat mapping tool'),
('cyber_threat_intelligence', 'vx-underground', 'https://vx-underground.org/samples/Families/APT/', 'APT sample repository'),
('cyber_threat_intelligence', 'APT Map', 'https://aptmap.netlify.app/', 'Threat actor visualization map'),
('cyber_threat_intelligence', 'CFR Cyber Ops', 'https://www.cfr.org/cyber-operations/', 'Nation-state cyber operations'),
('cyber_threat_intelligence', 'Intezer OST Map', 'https://intezer.com/ost-map/', 'Threat actor map'),
('cyber_threat_intelligence', 'Ransom Wiki', 'https://ransom.wiki/', 'Ransomware wiki'),
('cyber_threat_intelligence', 'Kaspersky CyberTrace', 'https://support.kaspersky.com/datafeeds/about/13850', 'Threat intelligence feeds'),
('cyber_threat_intelligence', 'MISP Galaxy', 'https://raw.githubusercontent.com/MISP/misp-galaxy/main/clusters/threat-actor.json', 'Threat actor clusters'),
('cyber_threat_intelligence', 'InTheWild', 'https://inthewild.io/feed', 'Vulnerability feed'),
('cyber_threat_intelligence', 'RESCURE', 'https://rescure.me/feeds.html', 'Threat intelligence feeds'),
('cyber_threat_intelligence', 'IOC.One', 'https://ioc.one/', 'IOC search engine'),
('cyber_threat_intelligence', 'Dark Web Hub', 'https://slcyber.io/dark-web-hub/', 'Dark web intelligence'),
('cyber_threat_intelligence', 'CISA', 'https://www.cisa.gov/', 'Cybersecurity and Infrastructure Security Agency'),
('cyber_threat_intelligence', 'MITRE ATT&CK', 'https://attack.mitre.org/', 'Adversarial tactics and techniques knowledge base');
