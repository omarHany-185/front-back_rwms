package com.rwms;

import com.rwms.user.entity.User;
import com.rwms.user.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@SpringBootApplication
public class RwmsApplication {

	public static void main(String[] args) {
		SpringApplication.run(RwmsApplication.class, args);
	}

	@Bean
	public CommandLineRunner seedDatabase(UserRepository userRepository, BCryptPasswordEncoder passwordEncoder) {
		return args -> {
			if (!userRepository.findByEmail("manager@rwms.local").isPresent()) {
				User manager = User.builder()
						.fullName("Super Manager")
						.employeeId("MGR-001")
						.email("manager@rwms.local")
						.password(passwordEncoder.encode("manager123"))
						.githubUsername("super-manager")
						.phone("+11234567890")
						.department("Management")
						.role(User.Role.MANAGER)
						.status(User.Status.ACTIVE)
						.firstLogin(false)
						.build();
				userRepository.save(manager);
				System.out.println("[RWMS] Seeded manager@rwms.local / manager123 successfully");
			}
		};
	}

}
