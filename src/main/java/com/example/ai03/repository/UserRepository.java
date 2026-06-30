package com.example.ai03.repository;

import com.example.ai03.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByLoginIdAndActiveTrue(String loginId);

    boolean existsByLoginId(String loginId);
}
