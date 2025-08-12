#!/bin/bash
# Production Ubuntu Server Security Setup Script (Idempotent)

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
is_installed() {
    dpkg -l "$1" 2>/dev/null | grep -q "^ii"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

service_exists() {
    systemctl list-unit-files | grep -q "^$1"
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

echo "======================================"
echo "Starting Production Server Setup (Idempotent)"
echo "======================================"
echo ""

# 1. CREATE APP USER
echo "Checking app user..."
if ! id -u app >/dev/null 2>&1; then
    print_info "Creating app user..."
    adduser --disabled-password --gecos "" app
    usermod -aG sudo app
    
    # Check if sudoers entry already exists
    if ! grep -q "^app ALL=(ALL) NOPASSWD:ALL" /etc/sudoers.d/app 2>/dev/null; then
        echo "app ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/app
        chmod 440 /etc/sudoers.d/app
    fi
    print_status "User 'app' created with sudo privileges"
else
    print_status "User 'app' already exists"
fi

# Set up SSH directory for app user
if [ ! -d /home/app/.ssh ]; then
    print_info "Creating SSH directory for app user..."
    mkdir -p /home/app/.ssh
    touch /home/app/.ssh/authorized_keys
    chown -R app:app /home/app/.ssh
    chmod 700 /home/app/.ssh
    chmod 600 /home/app/.ssh/authorized_keys
    print_status "SSH directory created for app user"
else
    print_status "SSH directory already exists for app user"
fi

# 2. FIREWALL CONFIGURATION
echo ""
echo "Configuring firewall..."
if ! is_installed ufw; then
    print_info "Installing UFW..."
    apt update && apt install -y ufw
else
    print_status "UFW already installed"
fi

# Check and add firewall rules
ufw status | grep -q "22/tcp" || ufw allow 22/tcp comment 'SSH'
ufw status | grep -q "80/tcp" || ufw allow 80/tcp comment 'HTTP'
ufw status | grep -q "443/tcp" || ufw allow 443/tcp comment 'HTTPS'

# Set defaults if not already set
ufw status verbose | grep -q "Default: deny (incoming)" || ufw default deny incoming
ufw status verbose | grep -q "Default: allow (outgoing)" || ufw default allow outgoing

# Enable firewall if not already enabled
if ! ufw status | grep -q "Status: active"; then
    ufw --force enable
    print_status "Firewall enabled"
else
    print_status "Firewall already active"
fi

# 3. SSH HARDENING
echo ""
echo "Hardening SSH configuration..."
SSH_CONFIG="/etc/ssh/sshd_config.d/hardening.conf"
if [ ! -f "$SSH_CONFIG" ]; then
    print_info "Creating SSH hardening configuration..."
    cat > "$SSH_CONFIG" <<EOF
PermitRootLogin prohibit-password
PubkeyAuthentication yes
PasswordAuthentication no
PermitEmptyPasswords no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
Protocol 2
AllowUsers root app
MaxSessions 20
MaxStartups 20:30:60
EOF
    # Ensure SSH runtime directory exists
    mkdir -p /run/sshd
    systemctl reload ssh
    print_status "SSH configuration hardened"
else
    print_status "SSH hardening already configured"
fi

# 4. FAIL2BAN (Brute force protection)
echo ""
echo "Configuring fail2ban..."
if ! is_installed fail2ban; then
    print_info "Installing fail2ban..."
    apt install -y fail2ban
else
    print_status "fail2ban already installed"
fi

JAIL_CONFIG="/etc/fail2ban/jail.local"
if [ ! -f "$JAIL_CONFIG" ]; then
    print_info "Creating fail2ban configuration..."
    cat > "$JAIL_CONFIG" <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
EOF
    systemctl enable fail2ban
    systemctl restart fail2ban
    print_status "fail2ban configured"
else
    print_status "fail2ban already configured"
fi

# 5. AUTOMATIC SECURITY UPDATES
echo ""
echo "Configuring automatic security updates..."
if ! is_installed unattended-upgrades; then
    print_info "Installing unattended-upgrades..."
    apt install -y unattended-upgrades apt-listchanges
else
    print_status "unattended-upgrades already installed"
fi

UNATTENDED_CONFIG="/etc/apt/apt.conf.d/50unattended-upgrades"
if [ ! -f "$UNATTENDED_CONFIG" ] || ! grep -q "Unattended-Upgrade::Allowed-Origins" "$UNATTENDED_CONFIG"; then
    print_info "Configuring unattended-upgrades..."
    cat > "$UNATTENDED_CONFIG" <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

    cat > /etc/apt/apt.conf.d/20auto-upgrades <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF
    print_status "Automatic updates configured"
else
    print_status "Automatic updates already configured"
fi

# 6. DOCKER INSTALLATION
echo ""
echo "Installing Docker..."

# Check if Docker is already installed
if ! command_exists docker; then
    print_info "Installing Docker prerequisites..."
    apt-get update
    apt-get install -y ca-certificates curl
    
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    if [ ! -f /etc/apt/keyrings/docker.asc ]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
        chmod a+r /etc/apt/keyrings/docker.asc
    fi
    
    # Add the repository to Apt sources
    if [ ! -f /etc/apt/sources.list.d/docker.list ]; then
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
          $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
          tee /etc/apt/sources.list.d/docker.list > /dev/null
    fi
    
    apt-get update
    print_info "Installing Docker packages..."
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin
    print_status "Docker installed"
else
    print_status "Docker already installed"
fi

# Install Docker Compose standalone
DOCKER_COMPOSE_PATH="/usr/local/bin/docker-compose"
DOCKER_COMPOSE_VERSION="v2.39.2"

if [ ! -f "$DOCKER_COMPOSE_PATH" ]; then
    print_info "Installing Docker Compose $DOCKER_COMPOSE_VERSION..."
    curl -SL "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-linux-x86_64" -o "$DOCKER_COMPOSE_PATH"
    chmod +x "$DOCKER_COMPOSE_PATH"
    print_status "Docker Compose installed"
else
    # Check version
    INSTALLED_VERSION=$($DOCKER_COMPOSE_PATH version --short 2>/dev/null || echo "unknown")
    if [[ "$INSTALLED_VERSION" == *"$DOCKER_COMPOSE_VERSION"* ]]; then
        print_status "Docker Compose $DOCKER_COMPOSE_VERSION already installed"
    else
        print_info "Updating Docker Compose from $INSTALLED_VERSION to $DOCKER_COMPOSE_VERSION..."
        curl -SL "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-linux-x86_64" -o "$DOCKER_COMPOSE_PATH"
        chmod +x "$DOCKER_COMPOSE_PATH"
        print_status "Docker Compose updated"
    fi
fi

# Add app user to docker group
if ! groups app | grep -q docker; then
    usermod -aG docker app
    print_status "User 'app' added to docker group"
else
    print_status "User 'app' already in docker group"
fi

# Enable and start Docker
if service_exists docker; then
    if ! systemctl is-enabled docker >/dev/null 2>&1; then
        systemctl enable docker
        print_status "Docker service enabled"
    else
        print_status "Docker service already enabled"
    fi
    
    if ! systemctl is-active docker >/dev/null 2>&1; then
        systemctl start docker
        print_status "Docker service started"
    else
        print_status "Docker service already running"
    fi
fi

# 7. SYSTEM HARDENING
echo ""
echo "Applying system hardening..."
SYSCTL_CONFIG="/etc/sysctl.d/99-security.conf"
if [ ! -f "$SYSCTL_CONFIG" ]; then
    print_info "Creating kernel security parameters..."
    cat > "$SYSCTL_CONFIG" <<EOF
# IP Spoofing protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Ignore send redirects
net.ipv4.conf.all.send_redirects = 0

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Log Martians
net.ipv4.conf.all.log_martians = 1

# Ignore ICMP ping requests
net.ipv4.icmp_echo_ignore_broadcasts = 1

# SYN flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5
EOF
    sysctl -p "$SYSCTL_CONFIG" >/dev/null 2>&1
    print_status "Kernel parameters hardened"
else
    print_status "Kernel hardening already configured"
fi

# 8. INSTALL MONITORING TOOLS
echo ""
echo "Installing monitoring tools..."
MONITORING_TOOLS=(htop iotop iftop nethogs)
for tool in "${MONITORING_TOOLS[@]}"; do
    if ! is_installed "$tool"; then
        print_info "Installing $tool..."
        apt install -y "$tool"
        print_status "$tool installed"
    else
        print_status "$tool already installed"
    fi
done

# 9. AUDITD for system auditing
echo ""
echo "Configuring system auditing..."
if ! is_installed auditd; then
    print_info "Installing auditd..."
    apt install -y auditd
    systemctl enable auditd
    print_status "auditd installed and enabled"
else
    print_status "auditd already installed"
fi

# 10. ROOTKIT DETECTION
echo ""
echo "Installing rootkit detection tools..."
ROOTKIT_TOOLS=(rkhunter chkrootkit)
for tool in "${ROOTKIT_TOOLS[@]}"; do
    if ! is_installed "$tool"; then
        print_info "Installing $tool..."
        apt install -y "$tool"
        print_status "$tool installed"
    else
        print_status "$tool already installed"
    fi
done

# 11. FILE INTEGRITY MONITORING
echo ""
echo "Configuring file integrity monitoring..."
if ! is_installed aide; then
    print_info "Installing AIDE..."
    apt install -y aide
    if [ ! -f /var/lib/aide/aide.db ]; then
        aideinit || true  # Don't fail if already initialized
    fi
    print_status "AIDE installed"
else
    print_status "AIDE already installed"
fi

# 12. SECURE SHARED MEMORY
echo ""
echo "Securing shared memory..."
if ! grep -q "tmpfs /run/shm" /etc/fstab; then
    print_info "Adding secure shared memory configuration..."
    echo "tmpfs /run/shm tmpfs defaults,noexec,nosuid 0 0" >> /etc/fstab
    print_status "Shared memory secured"
else
    print_status "Shared memory already secured"
fi

# 13. SET UP LOGROTATE
echo ""
echo "Configuring log rotation..."
LOGROTATE_CONFIG="/etc/logrotate.d/custom"
if [ ! -f "$LOGROTATE_CONFIG" ]; then
    print_info "Creating log rotation configuration..."
    cat > "$LOGROTATE_CONFIG" <<EOF
/var/log/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 640 root adm
}
EOF
    print_status "Log rotation configured"
else
    print_status "Log rotation already configured"
fi

echo ""
echo "======================================"
echo -e "${GREEN}Production Server Setup Complete!${NC}"
echo "======================================"
echo ""
echo "Summary of configurations:"
echo "  • User 'app' configured with sudo privileges"
echo "  • Firewall enabled (ports 22, 80, 443)"
echo "  • SSH hardened (key-only auth)"
echo "  • Fail2ban protecting against brute force"
echo "  • Automatic security updates enabled"
echo "  • Docker and Docker Compose installed"
echo "  • System kernel parameters hardened"
echo "  • Monitoring and security tools installed"
echo ""
echo "IMPORTANT NEXT STEPS:"
echo "1. Set up SSH keys for 'app' user:"
echo "   On your local machine: ssh-keygen -t ed25519 -C 'your-email@example.com'"
echo "   Then copy your public key to the server using:"
echo "   cat ~/.ssh/id_ed25519.pub | ssh root@<server-ip> 'cat >> /home/app/.ssh/authorized_keys'"
echo ""
echo "2. Test SSH access with 'app' user before closing root session"
echo ""
echo "3. Test Docker installation:"
echo "   docker run hello-world"
echo "   docker-compose version"
echo ""
echo "4. Consider additional configurations:"
echo "   • SSL certificates with Let's Encrypt"
echo "   • Application-specific firewall rules"
echo "   • Backup strategy"
echo "   • Monitoring and alerting"
echo ""
echo "This script is idempotent - safe to run multiple times!"
